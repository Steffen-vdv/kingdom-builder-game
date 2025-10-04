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
import { snapshotPlayer, diffStepSnapshots } from '../src/translation/log';

const RESOURCE_KEYS = Object.keys(
	SYNTHETIC_RESOURCES,
) as SyntheticResourceKey[];

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

describe('log resource sources', () => {
	it('ignores opponent mills when logging farm gains', () => {
		const scenario = createSyntheticTaxScenario();
		const ctx = createEngine({
			actions: scenario.factory.actions,
			buildings: scenario.factory.buildings,
			developments: scenario.factory.developments,
			populations: scenario.factory.populations,
			phases: scenario.phases,
			start: scenario.start,
			rules: scenario.rules,
		});
		// Give opponent a mill
		ctx.game.currentPlayerIndex = 1;
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: SYNTHETIC_IDS.millBuilding },
				},
			],
			ctx,
		);
		ctx.game.currentPlayerIndex = 0;

		const growthPhase = ctx.phases.find(
			(p) => p.id === SYNTHETIC_PHASE_IDS.growth,
		);
		const step = growthPhase?.steps.find(
			(s) => s.id === SYNTHETIC_STEP_IDS.gainIncome,
		);
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		const bundles = collectTriggerEffects('onGainIncomeStep', ctx);
		for (const bundle of bundles) runEffects(bundle.effects, ctx);
		const effects = bundles.flatMap((bundle) => bundle.effects);
		const after = snapshotPlayer(ctx.activePlayer, ctx);
		const lines = diffStepSnapshots(
			before,
			after,
			{ ...step, effects } as typeof step,
			ctx,
			RESOURCE_KEYS,
		);
		const goldInfo = SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin];
		const farmIcon =
			ctx.developments.get(SYNTHETIC_IDS.farmDevelopment)?.icon || '';
		const b = before.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const a = after.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const delta = a - b;
		expect(lines[0]).toBe(
			`${goldInfo.icon} ${goldInfo.label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a}) (${goldInfo.icon}${delta >= 0 ? '+' : ''}${delta} from ${farmIcon})`,
		);
	});

	it('logs market bonus when taxing population', () => {
		const scenario = createSyntheticTaxScenario();
		const ctx = createEngine({
			actions: scenario.factory.actions,
			buildings: scenario.factory.buildings,
			developments: scenario.factory.developments,
			populations: scenario.factory.populations,
			phases: scenario.phases,
			start: scenario.start,
			rules: scenario.rules,
		});
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: SYNTHETIC_IDS.marketBuilding },
				},
			],
			ctx,
		);
		while (ctx.game.currentPhase !== SYNTHETIC_PHASE_IDS.main) advance(ctx);
		const step = {
			id: SYNTHETIC_IDS.taxAction,
			effects: ctx.actions.get(SYNTHETIC_IDS.taxAction).effects,
		};
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		performAction(SYNTHETIC_IDS.taxAction, ctx);
		const after = snapshotPlayer(ctx.activePlayer, ctx);
		const lines = diffStepSnapshots(before, after, step, ctx, RESOURCE_KEYS);
		const goldInfo = SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin];
		const populationRoleIcon =
			SYNTHETIC_POPULATION_ROLES[SYNTHETIC_POPULATION_ROLE_ID]?.icon || '';
		expect(populationRoleIcon).toBeTruthy();
		const marketIcon =
			ctx.buildings.get(SYNTHETIC_IDS.marketBuilding)?.icon || '';
		const goldLine = lines.find((l) =>
			l.startsWith(`${goldInfo.icon} ${goldInfo.label}`),
		);
		expect(goldLine).toMatch(
			new RegExp(`from ${populationRoleIcon}${marketIcon}\\)$`),
		);
	});

	it('includes upkeep sources when paying upkeep', () => {
		const scenario = createSyntheticTaxScenario();
		const ctx = createEngine({
			actions: scenario.factory.actions,
			buildings: scenario.factory.buildings,
			developments: scenario.factory.developments,
			populations: scenario.factory.populations,
			phases: scenario.phases,
			start: scenario.start,
			rules: scenario.rules,
		});
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: SYNTHETIC_IDS.raidersGuild },
				},
			],
			ctx,
		);
		const upkeepPhase = ctx.phases.find(
			(p) => p.id === SYNTHETIC_PHASE_IDS.upkeep,
		);
		const step = upkeepPhase?.steps.find(
			(s) => s.id === SYNTHETIC_STEP_IDS.payUpkeep,
		);
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		const bundles = collectTriggerEffects('onPayUpkeepStep', ctx);
		for (const bundle of bundles) runEffects(bundle.effects, ctx);
		const effects = bundles.flatMap((bundle) => bundle.effects);
		const after = snapshotPlayer(ctx.activePlayer, ctx);
		const lines = diffStepSnapshots(
			before,
			after,
			{ ...step, effects } as typeof step,
			ctx,
			RESOURCE_KEYS,
		);
		const goldInfo = SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin];
		const goldLine = lines.find((l) =>
			l.startsWith(`${goldInfo.icon} ${goldInfo.label}`),
		);
		expect(goldLine).toBeTruthy();
		const b = before.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const a = after.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const delta = a - b;
		const icons = effects
			.filter((eff) => eff.params?.['key'] === SYNTHETIC_RESOURCE_KEYS.coin)
			.map((eff) => {
				const source = (
					eff.meta as {
						source?: { type?: string; id?: string; count?: number };
					}
				)?.source;
				if (!source?.type) return '';
				if (source.type === 'population') {
					const role = source.id;
					const icon = role
						? ctx.populations.get(role)?.icon || role
						: SYNTHETIC_POPULATION_INFO.icon;
					if (!icon) return '';
					if (source.count === undefined) return icon;
					const rawCount = Number(source.count);
					if (!Number.isFinite(rawCount)) return icon;
					const normalizedCount =
						rawCount > 0 ? Math.max(1, Math.round(rawCount)) : 0;
					if (normalizedCount === 0) return '';
					return icon.repeat(normalizedCount);
				}
				if (source.type === 'development' && source.id)
					return ctx.developments.get(source.id)?.icon || '';
				if (source.type === 'building' && source.id)
					return ctx.buildings.get(source.id)?.icon || '';
				if (source.type === 'land') return SYNTHETIC_LAND_INFO.icon || '';
				return '';
			})
			.filter(Boolean)
			.join('');
		expect(icons).not.toBe('');
		const raidersGuildIcon =
			ctx.buildings.get(SYNTHETIC_IDS.raidersGuild)?.icon || '';
		expect(raidersGuildIcon).not.toBe('');
		expect(icons).toContain(raidersGuildIcon);
		const zeroPopulationIcons = Object.entries(ctx.activePlayer.population)
			.filter(([, count]) => count === 0)
			.map(([role]) => ctx.populations.get(role)?.icon)
			.filter((icon): icon is string => Boolean(icon));
		for (const icon of zeroPopulationIcons) {
			expect(icons).not.toContain(icon);
		}
		expect(goldLine).toContain(
			`${goldInfo.icon}${delta >= 0 ? '+' : ''}${delta} from ${icons}`,
		);
	});
});
