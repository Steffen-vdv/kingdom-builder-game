import { createEngine } from '@kingdom-builder/engine';
import { Registry } from '@kingdom-builder/engine/registry';
import {
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	type ActionConfig,
	type BuildingConfig,
	type DevelopmentConfig,
	type PopulationConfig,
	type StartConfig,
} from '@kingdom-builder/protocol';
import type { PhaseDef } from '@kingdom-builder/engine';
import type { RuleSet } from '@kingdom-builder/engine/services';
import {
	happinessTier,
	effect,
	passiveParams,
} from '@kingdom-builder/contents/config/builders';
import {
	Types,
	PassiveMethods,
} from '@kingdom-builder/contents/config/builderShared';

export function createSyntheticContext() {
	const costKey = 'r0';
	const gainKey = 'r1';
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
					params: { key: gainKey, amount: 1 },
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
					params: { key: gainKey, amount: 2 },
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
					params: { key: gainKey, amount: 3 },
				},
			],
		},
	];
	actions.forEach((a) => actionsReg.add(a.id, a));

	const buildings = new Registry<BuildingConfig>(buildingSchema);
	const developments = new Registry<DevelopmentConfig>(developmentSchema);
	const populations = new Registry<PopulationConfig>(populationSchema);

	const phases: PhaseDef[] = [
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
							params: { key: costKey, amount: startAp },
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

	const ctx = createEngine({
		actions: actionsReg,
		buildings,
		developments,
		populations,
		phases,
		start,
		rules,
	});

	return { ctx, actions, phases, costKey, gainKey, start };
}
