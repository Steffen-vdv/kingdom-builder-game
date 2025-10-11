import { describe, it, expect } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import {
	snapshotPlayer,
	diffStepSnapshots,
	createTranslationDiffContext,
} from '../src/translation/log';
import { createSessionRegistries } from './helpers/sessionRegistries';
import { createDefaultTranslationAssets } from './helpers/translationAssets';
import { installTestRuntimeConfig } from './helpers/runtimeConfig';
import { getRuntimeConfig } from '../src/startup/runtimeConfig';

describe('log resource source icon registry', () => {
	installTestRuntimeConfig();
	const scenarios = [
		{
			name: 'population',
			getMeta: (engineContext: ReturnType<typeof createEngine>) => {
				const [roleId] = engineContext.populations.keys();
				expect(roleId).toBeTruthy();
				const icon = roleId
					? engineContext.assets.populations[roleId]?.icon || roleId
					: engineContext.assets.population.icon || '';
				expect(icon).toBeTruthy();
				return {
					meta: { type: 'population', id: roleId, count: 2 },
					expected: icon.repeat(2),
				} as const;
			},
		},
		{
			name: 'development',
			getMeta: (engineContext: ReturnType<typeof createEngine>) => {
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
			getMeta: (engineContext: ReturnType<typeof createEngine>) => {
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
			getMeta: (engineContext: ReturnType<typeof createEngine>) => {
				const landIcon = engineContext.assets.land.icon || '';
				expect(landIcon).toBeTruthy();
				return {
					meta: { type: 'land' },
					expected: landIcon,
				} as const;
			},
		},
	] as const;

	for (const { name, getMeta } of scenarios) {
		it(`renders icons for ${name} meta sources`, () => {
			const registries = createSessionRegistries();
			const runtimeConfig = getRuntimeConfig();
			const phases = runtimeConfig.phases?.length
				? runtimeConfig.phases
				: [
						{
							id: 'phase-main',
							action: true,
							steps: [{ id: 'phase-main:start' }],
						},
					];
			const startConfig = runtimeConfig.startConfig ?? {
				player: {
					resources: {},
					stats: {},
					population: {},
					lands: [],
				},
			};
			const ruleSet = runtimeConfig.ruleSet ?? {
				defaultActionAPCost: 1,
				absorptionCapPct: 1,
				absorptionRounding: 'down' as const,
				tieredResourceKey: 'resource',
				tierDefinitions: [],
				slotsPerNewLand: 1,
				maxSlotsPerLand: 1,
				basePopulationCap: 1,
				winConditions: [],
			};
			const engineContext = createEngine({
				actions: registries.actions,
				buildings: registries.buildings,
				developments: registries.developments,
				populations: registries.populations,
				phases,
				start: startConfig,
				rules: ruleSet,
			});
			engineContext.assets = createDefaultTranslationAssets();
			const { meta, expected } = getMeta(engineContext);
			const goldKey =
				Object.keys(registries.resources).find((key) => {
					return registries.resources[key]?.label === 'Gold';
				}) ?? Object.keys(registries.resources)[0];
			const resourceKeys = [goldKey];
			const effect = {
				type: 'resource' as const,
				method: 'add' as const,
				params: { key: goldKey, amount: 2 },
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
				resourceKeys,
			);
			const goldInfo = engineContext.assets.resources[goldKey] ?? {
				icon: '',
				label: goldKey,
			};
			const goldLine = lines.find((line) =>
				line.startsWith(`${goldInfo.icon} ${goldInfo.label}`),
			);
			expect(goldLine).toBeTruthy();
			const match = goldLine?.match(/ from (.+)\)$/);
			expect(match?.[1]).toBe(expected);
		});
	}
});
