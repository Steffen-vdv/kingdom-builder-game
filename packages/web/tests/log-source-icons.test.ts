import { describe, it, expect } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import {
	PHASES,
	GAME_START,
	RULES,
	LAND_INFO,
} from '@kingdom-builder/contents';
import { snapshotPlayer, diffStepSnapshots } from '../src/translation/log';
import { createSessionRegistries } from './helpers/sessionRegistries';
import {
	createEngineDiffContext,
	createTestResourceRegistry,
} from './helpers/diffContext';

const registries = createSessionRegistries();
const resourceKeyList = Object.keys(registries.resources) as string[];
if (resourceKeyList.length === 0) {
	throw new Error(
		'Session registries must include at least one resource definition.',
	);
}
const [resourceKey] = resourceKeyList as [string, ...string[]];
const RESOURCE_KEYS = [resourceKey] as const;

describe('log resource source icon registry', () => {
	const createEngineContext = () =>
		createEngine({
			actions: registries.actions,
			buildings: registries.buildings,
			developments: registries.developments,
			populations: registries.populations,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

	const toDiffContext = (
		engineContext: ReturnType<typeof createEngineContext>,
	) => {
		const resources = createTestResourceRegistry(registries.resources);
		return createEngineDiffContext(
			{
				activePlayer: engineContext.activePlayer,
				buildings: engineContext.buildings,
				developments: engineContext.developments,
				populations: engineContext.populations,
				passives: engineContext.passives,
			},
			resources,
		);
	};

	const scenarios = [
		{
			name: 'population',
			getMeta: (engineContext: ReturnType<typeof createEngineContext>) => {
				const [roleId] = engineContext.populations.keys();
				expect(roleId).toBeTruthy();
				const icon = roleId
					? engineContext.populations.get(roleId)?.icon || roleId
					: '';
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
				params: { key: resourceKey, amount: 2 },
				meta: { source: meta },
			};
			const step = { id: `meta-icons-${name}`, effects: [effect] };
			const before = snapshotPlayer(engineContext.activePlayer, engineContext);
			runEffects([effect], engineContext);
			const after = snapshotPlayer(engineContext.activePlayer, engineContext);
			const diffContext = toDiffContext(engineContext);
			const lines = diffStepSnapshots(
				before,
				after,
				step,
				diffContext,
				RESOURCE_KEYS,
			);
			const resourceInfo = registries.resources[resourceKey];
			const goldLine = lines.find((line) =>
				line.startsWith(
					`${resourceInfo?.icon ?? ''} ${resourceInfo?.label ?? resourceKey}`,
				),
			);
			expect(goldLine).toBeTruthy();
			const match = goldLine?.match(/ from (.+)\)$/);
			expect(match?.[1]).toBe(expected);
		});
	}
});
