import type { RuntimeConfig } from '../../src/startup/runtimeConfig';
import { setRuntimeConfig } from '../../src/startup/runtimeConfig';
import { createSessionRegistriesPayload } from './sessionRegistries';

export function buildTestRuntimeConfig(): RuntimeConfig {
	const registries = createSessionRegistriesPayload();
	const resourceEntries = Object.entries(registries.resources ?? {});
	const resourceMetadata = Object.fromEntries(
		resourceEntries.map(([key, definition]) => {
			return [key, { icon: definition.icon }];
		}),
	);
	const [primaryResourceKey] = resourceEntries;
	const primaryKey = primaryResourceKey?.[0] ?? 'resource-primary';
	const phases = [
		{
			id: 'phase-main',
			action: true,
			steps: [{ id: 'phase-main:start' }],
		},
	];
	const ruleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'down' as const,
		tieredResourceKey: primaryKey,
		tierDefinitions: [],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 3,
		basePopulationCap: 1,
		winConditions: [],
	};
	const startConfig = {
		player: {
			resources: { [primaryKey]: 10 },
			stats: {},
			population: {},
			lands: [
				{
					developments: [],
					slotsMax: 1,
					slotsUsed: 0,
					tilled: true,
				},
			],
		},
	};
	const developerPreset = {
		resources: [{ key: primaryKey, target: 100 }],
		population: [],
		landCount: 5,
		developments: [],
		buildings: [],
	};
	return {
		primaryIconResourceId: primaryKey,
		resourceMetadata,
		phases,
		ruleSet,
		startConfig,
		developerPreset,
	};
}

export function installTestRuntimeConfig(): RuntimeConfig {
	const config = buildTestRuntimeConfig();
	setRuntimeConfig(config);
	return config;
}
