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
	SYNTHETIC_POPULATION_INFO,
	SYNTHETIC_POPULATION_ROLES,
	SYNTHETIC_POPULATION_ROLE_ID,
	SYNTHETIC_PHASE_IDS,
	SYNTHETIC_ASSETS,
	SKIP_SETUP_ACTION_IDS,
	buildStartConfigEffects,
} from './fixtures/syntheticTaxLog';
import {
	snapshotPlayer,
	diffStepSnapshots,
	logContent,
	createTranslationDiffContext,
} from '../src/translation';
import type { TranslationActionCategoryRegistry } from '../src/translation/context';
import {
	cloneResourceCatalog,
	createResourceMetadataSelectors,
} from '../src/translation/context';
import { snapshotPlayer as snapshotEnginePlayer } from '../../engine/src/runtime/player_snapshot';
import {
	appendSubActionChanges,
	filterActionDiffChanges,
} from '../src/state/useActionPerformer.helpers';
import { formatActionLogLines } from '../src/state/actionLogFormat';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';
import type { ActionDiffChange } from '../src/translation/log/diff';

const RESOURCE_KEYS = Object.values(SYNTHETIC_RESOURCE_KEYS);

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function captureActivePlayer(engineContext: ReturnType<typeof createEngine>) {
	return snapshotPlayer(
		snapshotEnginePlayer(engineContext, engineContext.activePlayer),
	);
}

function filterChangeTree(
	changes: readonly ActionDiffChange[],
	allowed: Set<string>,
): ActionDiffChange[] {
	const filtered: ActionDiffChange[] = [];
	for (const change of changes) {
		const filteredChildren = change.children
			? filterChangeTree(change.children, allowed)
			: [];
		if (allowed.has(change.summary)) {
			const clone: ActionDiffChange = {
				summary: change.summary,
				...(change.meta ? { meta: { ...change.meta } } : {}),
			};
			if (filteredChildren.length) {
				clone.children = filteredChildren;
			}
			filtered.push(clone);
			continue;
		}
		filtered.push(...filteredChildren);
	}
	return filtered;
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
			rules: scenario.rules,
			resourceCatalog: scenario.resourceCatalog,
			systemActionIds: SKIP_SETUP_ACTION_IDS,
		});
		runEffects(buildStartConfigEffects(scenario.start), engineContext);
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
		engineContext.activePlayer.resourceValues[SYNTHETIC_RESOURCE_KEYS.coin] = 0;
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
		// Create resource metadata selectors from the catalog
		const catalogClone = cloneResourceCatalog(scenario.resourceCatalog);
		const resourceMetadata = createResourceMetadataSelectors(catalogClone);
		// Create stub action categories
		const actionCategories: TranslationActionCategoryRegistry = {
			categories: new Map(),
			get: () => undefined,
		};
		// Create proper activePlayer structure for diff context
		const diffActivePlayer = {
			id: engineContext.game.activePlayerId,
			population: { ...engineContext.activePlayer.population },
			lands: engineContext.activePlayer.lands.map((land) => ({
				developments: [...land.developments],
			})),
		};
		const translationDiffContext = createTranslationDiffContext({
			...engineContext,
			activePlayer: diffActivePlayer,
			actionCategories,
			resourceMetadata,
		});
		const diffResult = diffStepSnapshots(
			before,
			after,
			action,
			translationDiffContext,
			RESOURCE_KEYS,
		);
		const changes = diffResult.summaries;
		const messages = asTimelineLines(
			logContent('action', SYNTHETIC_IDS.taxAction, engineContext),
		);
		const costDescriptors: ActionLogLineDescriptor[] = [];
		for (const key of Object.keys(costs)) {
			const amount = costs[key] ?? 0;
			if (!amount) {
				continue;
			}
			const info = SYNTHETIC_RESOURCES[key];
			const icon = info?.icon ? `${info.icon} ` : '';
			const label = info?.label ?? key;
			const beforeAmount = before.values?.[key] ?? 0;
			const afterAmount = beforeAmount - amount;
			costDescriptors.push({
				text: `${icon}${label} -${amount} (${beforeAmount}→${afterAmount})`,
				depth: 2,
				kind: 'cost-detail',
			});
		}
		if (costDescriptors.length) {
			messages.splice(
				1,
				0,
				{ text: '💲 Action cost', depth: 1, kind: 'cost' },
				...costDescriptors,
			);
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
		const filteredTree = filterChangeTree(diffResult.tree, new Set(filtered));
		const logLines = formatActionLogLines(messages, filteredTree);
		const goldInfo = SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin];
		const populationIcon =
			SYNTHETIC_POPULATION_ROLES[SYNTHETIC_POPULATION_ROLE_ID]?.icon ||
			SYNTHETIC_POPULATION_INFO.icon;
		const marketIcon =
			engineContext.buildings.get(SYNTHETIC_IDS.marketBuilding)?.icon || '';
		const beforeCoins = before.values?.[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const afterCoins = after.values?.[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
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
