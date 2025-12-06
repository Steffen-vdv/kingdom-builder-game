import { SessionManager } from '../../src/session/SessionManager.js';
import type { SessionManagerOptions } from '../../src/session/SessionManager.js';
import {
	createContentFactory,
	createResourceV2Registries,
	resourceV2Definition,
} from '@kingdom-builder/testing';
import type { EngineSession } from '@kingdom-builder/engine';
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
import type { ContentFactory } from '@kingdom-builder/testing';

export type SyntheticSessionManagerOptions = Omit<
	SessionManagerOptions,
	'engineOptions'
> & {
	engineOptions?: SessionManagerOptions['engineOptions'];
};

export interface SyntheticSessionManagerResult {
	manager: SessionManager;
	factory: ContentFactory;
	costResourceId: string;
	gainResourceId: string;
	actionId: string;
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	primaryIconId: string | null;
}

export function createSyntheticSessionManager(
	options: SyntheticSessionManagerOptions = {},
): SyntheticSessionManagerResult {
	const factory = createContentFactory();
	const costResourceId = 'resource:synthetic:cost';
	const gainResourceId = 'resource:synthetic:gain';
	// Create ResourceV2 definitions for the synthetic resources
	const { resources, groups } = createResourceV2Registries({
		resources: [
			resourceV2Definition({
				id: costResourceId,
				metadata: { label: 'Cost', icon: '💰' },
				bounds: { lowerBound: 0 },
			}),
			resourceV2Definition({
				id: gainResourceId,
				metadata: { label: 'Gain', icon: '⭐' },
				bounds: { lowerBound: 0 },
			}),
		],
	});
	const action = factory.action({
		baseCosts: { [costResourceId]: 1 },
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
								resourceId: costResourceId,
								change: { type: 'amount', amount: 1 },
							},
						},
					],
				},
			],
		},
	];
	const start: StartConfig = {
		player: {
			resources: {},
			stats: {},
			population: {},
			lands: [],
			valuesV2: { [costResourceId]: 1, [gainResourceId]: 0 },
			resourceLowerBoundsV2: {
				[costResourceId]: 0,
				[gainResourceId]: 0,
			},
		},
	};
	const rules: RuleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'down',
		tieredResourceKey: gainResourceId,
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
	const defaultPrimaryIconId = gainResourceId;
	const engineOptions: NonNullable<SessionManagerOptions['engineOptions']> = {
		actions: engineOverrides.actions ?? factory.actions,
		actionCategories: engineOverrides.actionCategories ?? factory.categories,
		buildings: engineOverrides.buildings ?? factory.buildings,
		developments: engineOverrides.developments ?? factory.developments,
		populations: engineOverrides.populations ?? factory.populations,
		phases: engineOverrides.phases ?? phases,
		start: engineOverrides.start ?? start,
		rules: engineOverrides.rules ?? rules,
		resourceCatalogV2: engineOverrides.resourceCatalogV2 ?? {
			resources,
			groups,
		},
		primaryIconId: engineOverrides.primaryIconId ?? defaultPrimaryIconId,
	};
	const manager = new SessionManager({
		...rest,
		engineOptions,
	});
	return {
		manager,
		factory,
		costResourceId,
		gainResourceId,
		actionId: action.id,
		phases,
		start,
		rules,
		primaryIconId: engineOptions.primaryIconId ?? null,
	};
}

export function findAiPlayerId(session: EngineSession): string | null {
	const snapshot = session.getSnapshot();
	for (const player of snapshot.game.players) {
		if (session.hasAiController(player.id)) {
			return player.id;
		}
	}
	return null;
}
