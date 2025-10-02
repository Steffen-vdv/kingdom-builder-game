import { describe, it, expect, vi } from 'vitest';
import {
	createEngine,
	runEffects,
	performAction,
	advance,
	collectTriggerEffects,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	RULES,
	RESOURCES,
	Resource,
	type ResourceKey,
	ON_GAIN_INCOME_STEP,
	ON_PAY_UPKEEP_STEP,
	LAND_INFO,
	POPULATION_INFO,
} from '@kingdom-builder/contents';
import { snapshotPlayer, diffStepSnapshots } from '../src/translation/log';
import { cloneStart, SYNTHETIC_IDS } from './syntheticContent';

const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});
vi.mock(
	'@kingdom-builder/contents',
	async () => (await import('./syntheticContent')).syntheticModule,
);

describe('log resource sources', () => {
	it('ignores opponent windmills when logging field gains', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: cloneStart(),
			rules: RULES,
		});
		ctx.game.currentPlayerIndex = 1;
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: SYNTHETIC_IDS.buildings.windmill },
				},
			],
			ctx,
		);
		ctx.game.currentPlayerIndex = 0;

		const incomePhase = ctx.phases.find(
			(p) => p.id === SYNTHETIC_IDS.phases.growth,
		);
		const step = incomePhase?.steps.find(
			(s) => s.id === SYNTHETIC_IDS.steps.income,
		);
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		const bundles = collectTriggerEffects(ON_GAIN_INCOME_STEP, ctx);
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
		const coinInfo = RESOURCES[Resource.coin];
		const fieldIcon =
			DEVELOPMENTS.get(SYNTHETIC_IDS.developments.field)?.icon || '';
		const b = before.resources[Resource.coin] ?? 0;
		const a = after.resources[Resource.coin] ?? 0;
		const delta = a - b;
		expect(lines[0]).toBe(
			`${coinInfo.icon} ${coinInfo.label} ${
				delta >= 0 ? '+' : ''
			}${delta} (${b}→${a}) (${coinInfo.icon}${delta >= 0 ? '+' : ''}${delta} from ${fieldIcon})`,
		);
	});

	it('logs bazaar bonus when levying citizens', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: cloneStart(),
			rules: RULES,
		});
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: SYNTHETIC_IDS.buildings.bazaar },
				},
			],
			ctx,
		);
		while (ctx.game.currentPhase !== SYNTHETIC_IDS.phases.main) advance(ctx);
		const action = ctx.actions.get(SYNTHETIC_IDS.actions.levy);
		const step = { id: action.id, effects: action.effects };
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		performAction(action.id, ctx);
		const after = snapshotPlayer(ctx.activePlayer, ctx);
		const lines = diffStepSnapshots(before, after, step, ctx, RESOURCE_KEYS);
		const coinInfo = RESOURCES[Resource.coin];
		const populationIcon = POPULATION_INFO.icon;
		expect(populationIcon).toBeTruthy();
		const coinLine = lines.find((l) =>
			l.startsWith(`${coinInfo.icon} ${coinInfo.label}`),
		);
		const levyBefore = before.resources[Resource.coin] ?? 0;
		const levyAfter = after.resources[Resource.coin] ?? 0;
		const levyDelta = levyAfter - levyBefore;
		expect(coinLine).toBe(
			`${coinInfo.icon} ${coinInfo.label} ${
				levyDelta >= 0 ? '+' : ''
			}${levyDelta} (${levyBefore}→${levyAfter}) (${coinInfo.icon}${
				levyDelta >= 0 ? '+' : ''
			}${levyDelta} from ${populationIcon.repeat(2)})`,
		);
	});

	it('includes upkeep sources when paying upkeep', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: cloneStart(),
			rules: RULES,
		});
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: SYNTHETIC_IDS.buildings.watchtower },
				},
			],
			ctx,
		);
		const upkeepPhase = ctx.phases.find(
			(p) => p.id === SYNTHETIC_IDS.phases.upkeep,
		);
		const step = upkeepPhase?.steps.find(
			(s) => s.id === SYNTHETIC_IDS.steps.upkeep,
		);
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		const bundles = collectTriggerEffects(ON_PAY_UPKEEP_STEP, ctx);
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
		const coinInfo = RESOURCES[Resource.coin];
		const coinLine = lines.find((l) =>
			l.startsWith(`${coinInfo.icon} ${coinInfo.label}`),
		);
		expect(coinLine).toBeTruthy();
		const b = before.resources[Resource.coin] ?? 0;
		const a = after.resources[Resource.coin] ?? 0;
		const delta = a - b;
		const icons = effects
			.filter((eff) => eff.params?.['key'] === Resource.coin)
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
						? POPULATIONS.get(role)?.icon || role
						: POPULATION_INFO.icon;
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
				if (source.type === 'land') return LAND_INFO.icon || '';
				return '';
			})
			.filter(Boolean)
			.join('');
		expect(icons).not.toBe('');
		const watchtowerIcon =
			BUILDINGS.get(SYNTHETIC_IDS.buildings.watchtower)?.icon || '';
		expect(watchtowerIcon).not.toBe('');
		expect(icons).toContain(watchtowerIcon);
		const zeroPopulationIcons = Object.entries(ctx.activePlayer.population)
			.filter(([, count]) => count === 0)
			.map(([role]) => POPULATIONS.get(role)?.icon)
			.filter((icon): icon is string => Boolean(icon));
		for (const icon of zeroPopulationIcons) {
			expect(icons).not.toContain(icon);
		}
		expect(coinLine).toContain(
			`${coinInfo.icon}${delta >= 0 ? '+' : ''}${delta} from ${icons}`,
		);
	});
});
