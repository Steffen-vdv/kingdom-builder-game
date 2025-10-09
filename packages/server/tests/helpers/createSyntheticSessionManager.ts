import { SessionManager } from '../../src/session/SessionManager.js';
import type { SessionManagerOptions } from '../../src/session/SessionManager.js';
import { createContentFactory } from '../../../engine/tests/factories/content.ts';
import {
	happinessTier,
	effect,
	passiveParams,
} from '@kingdom-builder/contents/config/builders';
import {
	Types,
	PassiveMethods,
} from '@kingdom-builder/contents/config/builderShared';
import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { ContentFactory } from '../../../engine/tests/factories/content';

export type SyntheticSessionManagerOptions = Omit<
	SessionManagerOptions,
	'engineOptions'
> & {
	engineOptions?: SessionManagerOptions['engineOptions'];
};

export interface SyntheticSessionManagerResult {
	manager: SessionManager;
	factory: ContentFactory;
	costKey: string;
	gainKey: string;
	actionId: string;
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
}

export function createSyntheticSessionManager(
	options: SyntheticSessionManagerOptions = {},
): SyntheticSessionManagerResult {
	const factory = createContentFactory();
	const costKey = 'synthetic:cost';
	const gainKey = 'synthetic:gain';
	const action = factory.action({
		baseCosts: { [costKey]: 1 },
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: { key: gainKey, amount: 1 },
			},
		],
	});
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
								key: costKey,
								amount: 1,
							},
						},
					],
				},
			],
		},
	];
	const start: StartConfig = {
		player: {
			resources: { [costKey]: 1, [gainKey]: 0 },
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
	const { engineOptions: engineOverrides = {}, ...rest } = options;
	const engineOptions: NonNullable<SessionManagerOptions['engineOptions']> = {
		actions: engineOverrides.actions ?? factory.actions,
		buildings: engineOverrides.buildings ?? factory.buildings,
		developments: engineOverrides.developments ?? factory.developments,
		populations: engineOverrides.populations ?? factory.populations,
		phases: engineOverrides.phases ?? phases,
		start: engineOverrides.start ?? start,
		rules: engineOverrides.rules ?? rules,
	};
	const manager = new SessionManager({
		...rest,
		engineOptions,
	});
	return {
		manager,
		factory,
		costKey,
		gainKey,
		actionId: action.id,
		phases,
		start,
		rules,
	};
}
