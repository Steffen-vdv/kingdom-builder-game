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
	createTranslationDiffContext,
} from '../src/translation';
import { snapshotPlayer as snapshotEnginePlayer } from '../../engine/src/runtime/player_snapshot';
import { buildActionResolution } from '../src/state/buildActionResolution';
import type { TranslationContext } from '../src/translation/context';
import type { SessionRegistries } from '../src/state/sessionRegistries';
import type { ActionConfig } from '@kingdom-builder/protocol';

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
		if (!action) {
			throw new Error('Missing tax action definition');
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
		const { logLines } = buildActionResolution({
			actionId: SYNTHETIC_IDS.taxAction,
			actionDefinition: action as unknown as ActionConfig,
			before,
			after,
			traces,
			costs,
			context: engineContext as unknown as TranslationContext,
			diffContext: translationDiffContext,
			resourceKeys: RESOURCE_KEYS,
			resources: resourceDefinitions,
		});
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
