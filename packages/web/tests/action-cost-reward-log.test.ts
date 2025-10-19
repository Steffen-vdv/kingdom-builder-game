import { describe, it, expect, vi } from 'vitest';
import type { ActionConfig } from '@kingdom-builder/protocol';
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
	SYNTHETIC_ASSETS,
} from './fixtures/syntheticTaxLog';
import {
	snapshotPlayer,
	createTranslationDiffContext,
} from '../src/translation';
import { buildActionResolution } from '../src/state/buildActionResolution';
import type { TranslationContext } from '../src/translation/context';
import type { SessionRegistries } from '../src/state/sessionRegistries';
import { snapshotPlayer as snapshotEnginePlayer } from '../../engine/src/runtime/player_snapshot';

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
		engineContext.assets = SYNTHETIC_ASSETS;
		engineContext.activePlayer.actions.add(refundAction.id);
		while (engineContext.game.currentPhase !== SYNTHETIC_PHASE_IDS.main) {
			advance(engineContext);
		}
		const before = captureActivePlayer(engineContext);
		const costs = getActionCosts(refundAction.id, engineContext);
		performAction(refundAction.id, engineContext);
		const after = captureActivePlayer(engineContext);
		const diffContext = createTranslationDiffContext(engineContext);
		const actionDefinition = engineContext.actions.get(refundAction.id);
		if (!actionDefinition) {
			throw new Error('Missing refund action definition');
		}
		const resourceDefinitions: SessionRegistries['resources'] =
			Object.fromEntries(
				Object.entries(SYNTHETIC_RESOURCES).map(([resourceKey, info]) => [
					resourceKey,
					{
						key: resourceKey,
						icon: info.icon,
						label: info.label,
					},
				]),
			);
		const { logLines, summaries } = buildActionResolution({
			actionId: refundAction.id,
			actionDefinition: actionDefinition as unknown as ActionConfig,
			before,
			after,
			traces: [],
			costs,
			context: engineContext as unknown as TranslationContext,
			diffContext,
			resourceKeys: RESOURCE_KEYS,
			resources: resourceDefinitions,
		});
		const coinInfo = SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin];
		const coinCost = costs[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		expect(logLines).toContain('• 💲 Action cost');
		const costEntry = logLines.find((line) =>
			line.includes(`${coinInfo.icon} ${coinInfo.label} -${coinCost} `),
		);
		expect(costEntry).toBeDefined();
		const beforeCoins = before.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const afterCoins = after.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const rewardLine = summaries.find(
			(line) =>
				line.startsWith(`${coinInfo.icon} ${coinInfo.label}`) &&
				line.includes('+') &&
				line.includes(`(${beforeCoins}→${afterCoins})`),
		);
		expect(rewardLine).toBeDefined();
	});
});
