import { createEngine } from '@kingdom-builder/engine';
import {
	Registry,
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	type ActionConfig,
	type BuildingConfig,
	type DevelopmentConfig,
	type PopulationConfig,
	type StartConfig,
	type PhaseConfig,
	type RuleSet,
} from '@kingdom-builder/protocol';
import {
	happinessTier,
	effect,
	passiveParams,
} from '@kingdom-builder/contents/config/builders';
import {
	Types,
	PassiveMethods,
} from '@kingdom-builder/contents/config/builderShared';
import {
	createResourceV2Registries,
	resourceV2Definition,
} from '@kingdom-builder/testing';

export function createSyntheticContext() {
	const costKey = 'r0';
	const gainKey = 'r1';
	const costResourceId = 'resource:synthetic:r0';
	const gainResourceId = 'resource:synthetic:r1';
	const startAp = 3;

	const actionsReg = new Registry<ActionConfig>(actionSchema);
	const actions: ActionConfig[] = [
		{
			id: 'a1',
			name: 'a1',
			baseCosts: { [costKey]: 1 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						resourceId: gainResourceId,
						change: { type: 'amount', amount: 1 },
					},
				},
			],
		},
		{
			id: 'a2',
			name: 'a2',
			baseCosts: { [costKey]: 1 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						resourceId: gainResourceId,
						change: { type: 'amount', amount: 2 },
					},
				},
			],
		},
		{
			id: 'a3',
			name: 'a3',
			baseCosts: { [costKey]: 1 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						resourceId: gainResourceId,
						change: { type: 'amount', amount: 3 },
					},
				},
			],
		},
	];
	actions.forEach((a) => actionsReg.add(a.id, a));

	const buildings = new Registry<BuildingConfig>(buildingSchema);
	const developments = new Registry<DevelopmentConfig>(developmentSchema);
	const populations = new Registry<PopulationConfig>(populationSchema);

	const phases: PhaseConfig[] = [
		{ id: 'main', action: true, steps: [{ id: 'main' }] },
		{
			id: 'end',
			steps: [
				{
					id: 'refresh',
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: {
								resourceId: costResourceId,
								change: { type: 'amount', amount: startAp },
							},
						},
					],
				},
			],
		},
	];

	const start: StartConfig = {
		player: {
			resources: { [costKey]: startAp, [gainKey]: 0 },
			stats: {},
			population: {},
			lands: [],
		},
	};

	const rules: RuleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'down',
		tieredResourceKey: gainKey,
		tierDefinitions: [
			happinessTier('synthetic:happiness:baseline')
				.range(0)
				.incomeMultiplier(1)
				.passive(
					effect()
						.type(Types.Passive)
						.method(PassiveMethods.ADD)
						.params(
							passiveParams()
								.id('synthetic:passive:baseline')
								.detail('synthetic:happiness:baseline')
								.build(),
						),
				)
				.build(),
		],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 1,
		basePopulationCap: 1,
		winConditions: [],
	};

	const { resources: resourcesV2, groups: resourceGroupsV2 } =
		createResourceV2Registries({
			resources: [
				resourceV2Definition({
					id: 'resource:synthetic:r0',
					metadata: { label: 'Synthetic AP', icon: '⚡' },
					bounds: { lowerBound: 0 },
				}),
				resourceV2Definition({
					id: 'resource:synthetic:r1',
					metadata: { label: 'Synthetic Gain', icon: '🪙' },
					bounds: { lowerBound: 0 },
				}),
			],
		});

	const engineContext = createEngine({
		actions: actionsReg,
		buildings,
		developments,
		populations,
		phases,
		start,
		rules,
		resourceCatalogV2: {
			resources: resourcesV2,
			groups: resourceGroupsV2,
		},
	});

	return { engineContext, actions, phases, costKey, gainKey, start };
}
