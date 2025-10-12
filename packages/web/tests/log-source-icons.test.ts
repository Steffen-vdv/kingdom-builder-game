import { describe, it, expect } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import {
	snapshotPlayer,
	diffStepSnapshots,
	createTranslationDiffContext,
} from '../src/translation/log';
import { createSessionRegistries } from './helpers/sessionRegistries';
import { createTranslationEnvironmentFromEngine } from './helpers/createTranslationEnvironment';
import { selectPopulationRoleDisplay } from '../src/translation/context/assetSelectors';

const phases: PhaseConfig[] = [
	{
		id: 'phase-main',
		steps: [{ id: 'phase-main:start' }],
		action: true,
	},
];

const startConfig: StartConfig = {
	player: {
		resources: {},
		stats: {},
		population: {},
		lands: [],
		buildings: [],
	},
	players: {
		B: {
			resources: {},
			stats: {},
			population: {},
			lands: [],
			buildings: [],
		},
	},
};

const rules: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'nearest',
	tieredResourceKey: 'gold',
	tierDefinitions: [],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 1,
	basePopulationCap: 1,
	winConditions: [],
};

describe('log resource source icon registry', () => {
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
			const engineContext = createEngine({
				actions: registries.actions,
				buildings: registries.buildings,
				developments: registries.developments,
				populations: registries.populations,
				phases,
				start: startConfig,
				rules,
			});
			const { translationContext } = createTranslationEnvironmentFromEngine(
				engineContext,
				registries,
			);
			engineContext.assets = translationContext.assets;
			const { meta, expected } = getMeta(engineContext);
			const goldKey =
				Object.keys(translationContext.assets.resources)[0] ??
				Object.keys(registries.resources)[0];
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

	it('falls back to meta labels when icons are missing', () => {
		const registries = createSessionRegistries();
		const engineContext = createEngine({
			actions: registries.actions,
			buildings: registries.buildings,
			developments: registries.developments,
			populations: registries.populations,
			phases,
			start: startConfig,
			rules,
		});
		const { translationContext } = createTranslationEnvironmentFromEngine(
			engineContext,
			registries,
		);
		const [populationId] = Array.from(engineContext.populations.keys());
		if (!populationId) {
			throw new Error('Expected population id for fallback test');
		}
		engineContext.assets = {
			...translationContext.assets,
			populations: {
				...translationContext.assets.populations,
				[populationId]: {},
			},
		} as typeof translationContext.assets;
		const goldKey =
			Object.keys(translationContext.assets.resources)[0] ?? 'resource:gold';
		const effect = {
			type: 'resource' as const,
			method: 'add' as const,
			params: { key: goldKey, amount: 1 },
			meta: { source: { type: 'population', id: populationId, count: 1 } },
		};
		const before = snapshotPlayer(engineContext.activePlayer, engineContext);
		runEffects([effect], engineContext);
		const after = snapshotPlayer(engineContext.activePlayer, engineContext);
		const diffContext = createTranslationDiffContext(engineContext);
		const lines = diffStepSnapshots(
			before,
			after,
			{ id: 'fallback-test', effects: [effect] },
			diffContext,
			[goldKey],
		);
		const roleDisplay = selectPopulationRoleDisplay(
			translationContext.assets,
			populationId,
		);
		const fallbackTokens = [roleDisplay.label, populationId].filter(
			(token): token is string => Boolean(token),
		);
		const fallbackLine = lines.find((line) =>
			fallbackTokens.some((token) => line.includes(token)),
		);
		expect(fallbackLine).toBeDefined();
		expect(fallbackLine?.includes('undefined')).toBe(false);
	});
});
