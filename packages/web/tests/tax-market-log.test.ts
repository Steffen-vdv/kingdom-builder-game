import { describe, it, expect, vi } from 'vitest';
import {
	createEngine,
	performAction,
	advance,
	getActionCosts,
	runEffects,
	type ActionTrace,
} from '@kingdom-builder/engine';
import {
	createSyntheticTaxScenario,
	SYNTHETIC_IDS,
	SYNTHETIC_RESOURCES,
	SYNTHETIC_RESOURCE_KEYS,
	type SyntheticResourceKey,
	SYNTHETIC_POPULATION_INFO,
	SYNTHETIC_POPULATION_ROLES,
	SYNTHETIC_POPULATION_ROLE_ID,
	SYNTHETIC_PHASE_IDS,
	SYNTHETIC_ASSETS,
} from './fixtures/syntheticTaxLog';
import {
	snapshotPlayer,
	diffStepSnapshots,
	logContent,
	createTranslationDiffContext,
} from '../src/translation';
import { snapshotPlayer as snapshotEnginePlayer } from '../../engine/src/runtime/player_snapshot';
import {
	appendSubActionChanges,
	filterActionDiffChanges,
} from '../src/state/useActionPerformer.helpers';
import { formatActionLogLines } from '../src/state/actionLogFormat';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';

const RESOURCE_KEYS = Object.keys(
	SYNTHETIC_RESOURCES,
) as SyntheticResourceKey[];

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function captureActivePlayer(engineContext: ReturnType<typeof createEngine>) {
	return snapshotPlayer(
		snapshotEnginePlayer(engineContext, engineContext.activePlayer),
	);
}

function asTimelineLines(
	entries: readonly (string | ActionLogLineDescriptor)[],
): ActionLogLineDescriptor[] {
	const lines: ActionLogLineDescriptor[] = [];
	for (const [index, entry] of entries.entries()) {
		if (typeof entry === 'string') {
			const text = entry.trim();
			if (!text) {
				continue;
			}
			lines.push({
				text,
				depth: index === 0 ? 0 : 1,
				kind: index === 0 ? 'headline' : 'effect',
			});
			continue;
		}
		lines.push(entry);
	}
	return lines;
}

describe('tax action logging with market', () => {
	it('shows population and market sources in gold gain', () => {
		const scenario = createSyntheticTaxScenario();
		const engineContext = createEngine({
			actions: scenario.factory.actions,
			buildings: scenario.factory.buildings,
			developments: scenario.factory.developments,
			populations: scenario.factory.populations,
			phases: scenario.phases,
			start: scenario.start,
			rules: scenario.rules,
		});
		engineContext.assets = SYNTHETIC_ASSETS;
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: SYNTHETIC_IDS.marketBuilding },
				},
			],
			engineContext,
		);
		engineContext.activePlayer.resources[SYNTHETIC_RESOURCE_KEYS.coin] = 0;
		while (engineContext.game.currentPhase !== SYNTHETIC_PHASE_IDS.main) {
			advance(engineContext);
		}
		const action = engineContext.actions.get(SYNTHETIC_IDS.taxAction);
		const before = captureActivePlayer(engineContext);
		const costs = getActionCosts(SYNTHETIC_IDS.taxAction, engineContext);
		const traces: ActionTrace[] = performAction(
			SYNTHETIC_IDS.taxAction,
			engineContext,
		);
		const after = captureActivePlayer(engineContext);
		const translationDiffContext = createTranslationDiffContext(engineContext);
		const changes = diffStepSnapshots(
			before,
			after,
			action,
			translationDiffContext,
			RESOURCE_KEYS,
		);
		const messages = asTimelineLines(
			logContent('action', SYNTHETIC_IDS.taxAction, engineContext),
		);
		const costDescriptors: ActionLogLineDescriptor[] = [];
		for (const key of Object.keys(costs) as SyntheticResourceKey[]) {
			const amount = costs[key] ?? 0;
			if (!amount) {
				continue;
			}
			const info = SYNTHETIC_RESOURCES[key];
			const icon = info?.icon ? `${info.icon} ` : '';
			const label = info?.label ?? key;
			const beforeAmount = before.resources[key] ?? 0;
			const afterAmount = beforeAmount - amount;
			costDescriptors.push({
				text: `${icon}${label} -${amount} (${beforeAmount}→${afterAmount})`,
				depth: 1,
				kind: 'cost',
			});
		}
		if (costDescriptors.length) {
			messages.splice(1, 0, ...costDescriptors);
		}
		const subLines = appendSubActionChanges({
			traces,
			context: engineContext,
			diffContext: translationDiffContext,
			resourceKeys: RESOURCE_KEYS,
			messages,
		});
		const filtered = filterActionDiffChanges({
			changes,
			messages,
			subLines,
		});
		const logLines = formatActionLogLines(messages, filtered);
		const goldInfo = SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin];
		const populationIcon =
			SYNTHETIC_POPULATION_ROLES[SYNTHETIC_POPULATION_ROLE_ID]?.icon ||
			SYNTHETIC_POPULATION_INFO.icon;
		const marketIcon =
			engineContext.buildings.get(SYNTHETIC_IDS.marketBuilding)?.icon || '';
		const beforeCoins = before.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const afterCoins = after.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const delta = afterCoins - beforeCoins;
		const goldLine = logLines.find((line) =>
			line
				.replace(/^•\s|^\s*↳\s/u, '')
				.startsWith(`${goldInfo.icon} ${goldInfo.label}`),
		);
		expect(goldLine).toBe(
			`• ${goldInfo.icon} ${goldInfo.label} ${
				delta >= 0 ? '+' : ''
			}${delta} (${beforeCoins}→${afterCoins}) (${goldInfo.icon}${
				delta >= 0 ? '+' : ''
			}${delta} from ${populationIcon}${marketIcon})`,
		);
	});
});
