import { describe, it, expect, vi } from 'vitest';
import {
	createEngine,
	runEffects,
	performAction,
	advance,
	collectTriggerEffects,
} from '@kingdom-builder/engine';
import {
	createSyntheticTaxScenario,
	SYNTHETIC_ASSETS,
	SYNTHETIC_IDS,
	SYNTHETIC_RESOURCES,
	SYNTHETIC_RESOURCE_KEYS,
	type SyntheticResourceKey,
	SYNTHETIC_PHASE_IDS,
	SYNTHETIC_STEP_IDS,
	SYNTHETIC_POPULATION_INFO,
	SYNTHETIC_POPULATION_ROLES,
	SYNTHETIC_POPULATION_ROLE_ID,
	SYNTHETIC_LAND_INFO,
} from './fixtures/syntheticTaxLog';
import {
	snapshotPlayer,
	diffStepSnapshots,
	createTranslationDiffContext,
} from '../src/translation/log';
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

describe('log resource sources', () => {
	it('ignores opponent mills when logging farm gains', () => {
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
		// Give opponent a mill
		engineContext.game.currentPlayerIndex = 1;
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: SYNTHETIC_IDS.millBuilding },
				},
			],
			engineContext,
		);
		engineContext.game.currentPlayerIndex = 0;

		const growthPhase = engineContext.phases.find(
			(phase) => phase.id === SYNTHETIC_PHASE_IDS.growth,
		);
		const gainIncomeStep = growthPhase?.steps.find(
			(stepDefinition) => stepDefinition.id === SYNTHETIC_STEP_IDS.gainIncome,
		);
		const before = captureActivePlayer(engineContext);
		const bundles = collectTriggerEffects('onGainIncomeStep', engineContext);
		for (const bundle of bundles) {
			runEffects(bundle.effects, engineContext);
		}
		const effects = bundles.flatMap((bundle) => bundle.effects);
		const after = captureActivePlayer(engineContext);
		const translationDiffContext = createTranslationDiffContext(engineContext);
		const lines = diffStepSnapshots(
			before,
			after,
			{ ...gainIncomeStep, effects } as typeof gainIncomeStep,
			translationDiffContext,
			RESOURCE_KEYS,
		);
		const goldInfo = SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin];
		const farmIcon =
			engineContext.developments.get(SYNTHETIC_IDS.farmDevelopment)?.icon || '';
		const beforeCoins = before.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const afterCoins = after.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const delta = afterCoins - beforeCoins;
		const expectedFarmIncomeLine =
			`${goldInfo.icon} ${goldInfo.label} ${delta >= 0 ? '+' : ''}` +
			`${delta} (${beforeCoins}→${afterCoins}) (` +
			`${goldInfo.icon}${delta >= 0 ? '+' : ''}${delta} from ${farmIcon})`;
		expect(lines[0]).toBe(expectedFarmIncomeLine);
	});

	it('logs market bonus when taxing population', () => {
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
		while (engineContext.game.currentPhase !== SYNTHETIC_PHASE_IDS.main) {
			advance(engineContext);
		}
		const taxStep = {
			id: SYNTHETIC_IDS.taxAction,
			effects: engineContext.actions.get(SYNTHETIC_IDS.taxAction).effects,
		};
		const before = captureActivePlayer(engineContext);
		performAction(SYNTHETIC_IDS.taxAction, engineContext);
		const after = captureActivePlayer(engineContext);
		const translationDiffContext = createTranslationDiffContext(engineContext);
		const lines = diffStepSnapshots(
			before,
			after,
			taxStep,
			translationDiffContext,
			RESOURCE_KEYS,
		);
		const goldInfo = SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin];
		const populationRoleIcon =
			SYNTHETIC_POPULATION_ROLES[SYNTHETIC_POPULATION_ROLE_ID]?.icon || '';
		expect(populationRoleIcon).toBeTruthy();
		const marketIcon =
			engineContext.buildings.get(SYNTHETIC_IDS.marketBuilding)?.icon || '';
		const goldLine = lines.find((line) =>
			line.startsWith(`${goldInfo.icon} ${goldInfo.label}`),
		);
		expect(goldLine).toMatch(
			new RegExp(`from ${populationRoleIcon}${marketIcon}\\)$`),
		);
	});

	it('includes upkeep sources when paying upkeep', () => {
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
					params: { id: SYNTHETIC_IDS.raidersGuild },
				},
			],
			engineContext,
		);
		const upkeepPhase = engineContext.phases.find(
			(phase) => phase.id === SYNTHETIC_PHASE_IDS.upkeep,
		);
		const payUpkeepStep = upkeepPhase?.steps.find(
			(stepDefinition) => stepDefinition.id === SYNTHETIC_STEP_IDS.payUpkeep,
		);
		const before = captureActivePlayer(engineContext);
		const bundles = collectTriggerEffects('onPayUpkeepStep', engineContext);
		for (const bundle of bundles) {
			runEffects(bundle.effects, engineContext);
		}
		const effects = bundles.flatMap((bundle) => bundle.effects);
		const after = captureActivePlayer(engineContext);
		const translationDiffContext = createTranslationDiffContext(engineContext);
		const lines = diffStepSnapshots(
			before,
			after,
			{ ...payUpkeepStep, effects } as typeof payUpkeepStep,
			translationDiffContext,
			RESOURCE_KEYS,
		);
		const goldInfo = SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin];
		const goldLine = lines.find((line) =>
			line.startsWith(`${goldInfo.icon} ${goldInfo.label}`),
		);
		expect(goldLine).toBeTruthy();
		const beforeCoins = before.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const afterCoins = after.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const delta = afterCoins - beforeCoins;
		const icons = effects
			.filter((eff) => eff.params?.['key'] === SYNTHETIC_RESOURCE_KEYS.coin)
			.map((eff) => {
				const source = (
					eff.meta as {
						source?: { type?: string; id?: string; count?: number };
					}
				)?.source;
				if (!source?.type) {
					return '';
				}
				if (source.type === 'population') {
					const role = source.id;
					const icon = role
						? engineContext.populations.get(role)?.icon || role
						: SYNTHETIC_POPULATION_INFO.icon;
					if (!icon) {
						return '';
					}
					if (source.count === undefined) {
						return icon;
					}
					const rawCount = Number(source.count);
					if (!Number.isFinite(rawCount)) {
						return icon;
					}
					const normalizedCount =
						rawCount > 0 ? Math.max(1, Math.round(rawCount)) : 0;
					if (normalizedCount === 0) {
						return '';
					}
					return icon.repeat(normalizedCount);
				}
				if (source.type === 'development' && source.id) {
					return engineContext.developments.get(source.id)?.icon || '';
				}
				if (source.type === 'building' && source.id) {
					return engineContext.buildings.get(source.id)?.icon || '';
				}
				if (source.type === 'land') {
					return SYNTHETIC_LAND_INFO.icon || '';
				}
				return '';
			})
			.filter(Boolean)
			.join('');
		expect(icons).not.toBe('');
		const raidersGuildIcon =
			engineContext.buildings.get(SYNTHETIC_IDS.raidersGuild)?.icon || '';
		expect(raidersGuildIcon).not.toBe('');
		expect(icons).toContain(raidersGuildIcon);
		const zeroPopulationIcons = Object.entries(
			engineContext.activePlayer.population,
		)
			.filter(([, count]) => count === 0)
			.map(([role]) => engineContext.populations.get(role)?.icon)
			.filter((icon): icon is string => Boolean(icon));
		for (const icon of zeroPopulationIcons) {
			expect(icons).not.toContain(icon);
		}
		expect(goldLine).toContain(
			`${goldInfo.icon}${delta >= 0 ? '+' : ''}${delta} from ${icons}`,
		);
	});
});
