import { describe, it, expect, vi } from 'vitest';
import {
	createEngine,
	performAction,
	advance,
	getActionCosts,
} from '@kingdom-builder/engine';
import {
	createSyntheticTaxScenario,
	SYNTHETIC_RESOURCE_KEYS,
	SYNTHETIC_RESOURCES,
	type SyntheticResourceKey,
	SYNTHETIC_PHASE_IDS,
} from './fixtures/syntheticTaxLog';
import {
	snapshotPlayer,
	diffStepSnapshots,
	logContent,
} from '../src/translation';
import {
	createEngineTranslationDiffContext,
	createSessionResourceDefinitions,
} from './helpers/createDiffContext';
import { filterActionDiffChanges } from '../src/state/useActionPerformer.helpers';
import { formatActionLogLines } from '../src/state/actionLogFormat';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';

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

const RESOURCE_KEYS = Object.keys(
	SYNTHETIC_RESOURCES,
) as SyntheticResourceKey[];
const RESOURCE_DEFINITIONS =
	createSessionResourceDefinitions(SYNTHETIC_RESOURCES);

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

describe('action cost and reward logging', () => {
	it('shows both the cost block and reward highlight for the same resource', () => {
		const scenario = createSyntheticTaxScenario();
		const refundAction = scenario.factory.action({
			id: 'action:synthetic:refund',
			name: 'Synthetic Refund',
			icon: '♻️',
			baseCosts: {
				[SYNTHETIC_RESOURCE_KEYS.actionPoints]: 1,
				[SYNTHETIC_RESOURCE_KEYS.coin]: 4,
			},
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: SYNTHETIC_RESOURCE_KEYS.coin, amount: 6 },
				},
			],
		});
		const engineContext = createEngine({
			actions: scenario.factory.actions,
			buildings: scenario.factory.buildings,
			developments: scenario.factory.developments,
			populations: scenario.factory.populations,
			phases: scenario.phases,
			start: scenario.start,
			rules: scenario.rules,
		});
		engineContext.activePlayer.actions.add(refundAction.id);
		while (engineContext.game.currentPhase !== SYNTHETIC_PHASE_IDS.main) {
			advance(engineContext);
		}
		const before = snapshotPlayer(engineContext.activePlayer, engineContext);
		const costs = getActionCosts(refundAction.id, engineContext);
		performAction(refundAction.id, engineContext);
		const after = snapshotPlayer(engineContext.activePlayer, engineContext);
		const diffContext = createEngineTranslationDiffContext(
			engineContext,
			RESOURCE_DEFINITIONS,
		);
		const actionDefinition = engineContext.actions.get(refundAction.id);
		if (!actionDefinition) {
			throw new Error('Missing refund action definition');
		}
		const changes = diffStepSnapshots(
			before,
			after,
			actionDefinition,
			diffContext,
			RESOURCE_KEYS,
		);
		const messages = asTimelineLines(
			logContent('action', refundAction.id, engineContext),
		);
		const costLines: ActionLogLineDescriptor[] = [];
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
			costLines.push({
				text: `${icon}${label} -${amount} (${beforeAmount}→${afterAmount})`,
				depth: 2,
				kind: 'cost-detail',
			});
		}
		if (costLines.length) {
			messages.splice(
				1,
				0,
				{ text: '💲 Action cost', depth: 1, kind: 'cost' },
				...costLines,
			);
		}
		const filtered = filterActionDiffChanges({
			changes,
			messages,
			subLines: [],
		});
		const logLines = formatActionLogLines(messages, filtered);
		const coinInfo = SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin];
		const coinCost = costs[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		expect(logLines).toContain('• 💲 Action cost');
		const costEntry = logLines.find((line) =>
			line.includes(`${coinInfo.icon} ${coinInfo.label} -${coinCost} `),
		);
		expect(costEntry).toBeDefined();
		const beforeCoins = before.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const afterCoins = after.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const rewardLine = filtered.find(
			(line) =>
				line.startsWith(`${coinInfo.icon} ${coinInfo.label}`) &&
				line.includes('+') &&
				line.includes(`(${beforeCoins}→${afterCoins})`),
		);
		expect(rewardLine).toBeDefined();
	});
});
