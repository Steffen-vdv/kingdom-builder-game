import { describe, it, expect } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	RESOURCES,
	Resource,
	LAND_INFO,
	POPULATION_INFO,
} from '@kingdom-builder/contents';
import {
	snapshotPlayer,
	diffStepSnapshots,
	createTranslationDiffContext,
} from '../src/translation/log';

const RESOURCE_KEYS = [Resource.gold] as const;

describe('log resource source icon registry', () => {
	const createEngineContext = () =>
		createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

	const scenarios = [
		{
			name: 'population',
			getMeta: (engineContext: ReturnType<typeof createEngineContext>) => {
				const [roleId] = engineContext.populations.keys();
				expect(roleId).toBeTruthy();
				const icon = roleId
					? engineContext.populations.get(roleId)?.icon || roleId
					: POPULATION_INFO.icon || '';
				expect(icon).toBeTruthy();
				return {
					meta: { type: 'population', id: roleId, count: 2 },
					expected: icon.repeat(2),
				} as const;
			},
		},
		{
			name: 'development',
			getMeta: (engineContext: ReturnType<typeof createEngineContext>) => {
				const devId = engineContext.developments
					.keys()
					.find((id) => Boolean(engineContext.developments.get(id)?.icon));
				expect(devId).toBeTruthy();
				const icon = devId
					? engineContext.developments.get(devId)?.icon || ''
					: '';
				expect(icon).toBeTruthy();
				return {
					meta: { type: 'development', id: devId },
					expected: icon,
				} as const;
			},
		},
		{
			name: 'building',
			getMeta: (engineContext: ReturnType<typeof createEngineContext>) => {
				const buildingId = engineContext.buildings
					.keys()
					.find((id) => Boolean(engineContext.buildings.get(id)?.icon));
				expect(buildingId).toBeTruthy();
				const icon = buildingId
					? engineContext.buildings.get(buildingId)?.icon || ''
					: '';
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
			const engineContext = createEngineContext();
			const { meta, expected } = getMeta(engineContext);
			const effect = {
				type: 'resource' as const,
				method: 'add' as const,
				params: { key: Resource.gold, amount: 2 },
				meta: { source: meta },
			};
			const step = { id: `meta-icons-${name}`, effects: [effect] };
			const before = snapshotPlayer(engineContext.activePlayer, engineContext);
			runEffects([effect], engineContext);
			const after = snapshotPlayer(engineContext.activePlayer, engineContext);
			const diffContext = createTranslationDiffContext(engineContext);
			const lines = diffStepSnapshots(
				before,
				after,
				step,
				diffContext,
				RESOURCE_KEYS,
			);
			const goldInfo = RESOURCES[Resource.gold];
			const goldLine = lines.find((line) =>
				line.startsWith(`${goldInfo.icon} ${goldInfo.label}`),
			);
			expect(goldLine).toBeTruthy();
			const match = goldLine?.match(/ from (.+)\)$/);
			expect(match?.[1]).toBe(expected);
		});
	}
});
