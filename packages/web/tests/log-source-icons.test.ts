import { describe, it, expect, vi } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	RULES,
	RESOURCES,
	Resource,
	LAND_INFO,
	POPULATION_INFO,
} from '@kingdom-builder/contents';
import { snapshotPlayer, diffStepSnapshots } from '../src/translation/log';
import { cloneStart, SYNTHETIC_IDS } from './syntheticContent';

const RESOURCE_KEYS = [Resource.coin] as const;

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});
vi.mock(
	'@kingdom-builder/contents',
	async () => (await import('./syntheticContent')).syntheticModule,
);

describe('log resource source icon registry', () => {
	const createCtx = () =>
		createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: cloneStart(),
			rules: RULES,
		});

	const scenarios = [
		{
			name: 'population',
			getMeta: (_ctx: ReturnType<typeof createCtx>) => {
				const roleId = SYNTHETIC_IDS.populationRoles.citizen;
				const icon =
					POPULATIONS.get(roleId)?.icon || POPULATION_INFO.icon || roleId;
				expect(icon).toBeTruthy();
				return {
					meta: { type: 'population', id: roleId, count: 2 },
					expected: icon.repeat(2),
				} as const;
			},
		},
		{
			name: 'development',
			getMeta: (ctx: ReturnType<typeof createCtx>) => {
				const devId = SYNTHETIC_IDS.developments.field;
				const icon = ctx.developments.get(devId)?.icon || '';
				expect(icon).toBeTruthy();
				return {
					meta: { type: 'development', id: devId },
					expected: icon,
				} as const;
			},
		},
		{
			name: 'building',
			getMeta: (ctx: ReturnType<typeof createCtx>) => {
				const buildingId = SYNTHETIC_IDS.buildings.watchtower;
				const icon = ctx.buildings.get(buildingId)?.icon || '';
				expect(icon).toBeTruthy();
				return {
					meta: { type: 'building', id: buildingId },
					expected: icon,
				} as const;
			},
		},
		{
			name: 'land',
			getMeta: () => {
				expect(LAND_INFO.icon).toBeTruthy();
				return {
					meta: { type: 'land' },
					expected: LAND_INFO.icon || '',
				} as const;
			},
		},
	] as const;

	for (const { name, getMeta } of scenarios) {
		it(`renders icons for ${name} meta sources`, () => {
			const ctx = createCtx();
			const { meta, expected } = getMeta(ctx);
			const effect = {
				type: 'resource' as const,
				method: 'add' as const,
				params: { key: Resource.coin, amount: 2 },
				meta: { source: meta },
			};
			const step = { id: `meta-icons-${name}`, effects: [effect] };
			const before = snapshotPlayer(ctx.activePlayer, ctx);
			runEffects([effect], ctx);
			const after = snapshotPlayer(ctx.activePlayer, ctx);
			const lines = diffStepSnapshots(before, after, step, ctx, RESOURCE_KEYS);
			const coinInfo = RESOURCES[Resource.coin];
			const coinLine = lines.find((l) =>
				l.startsWith(`${coinInfo.icon} ${coinInfo.label}`),
			);
			expect(coinLine).toBeTruthy();
			const match = coinLine?.match(/ from (.+)\)$/);
			expect(match?.[1]).toBe(expected);
		});
	}
});
