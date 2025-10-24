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
	costKey: string;
	gainKey: string;
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
	const costKey = 'synthetic:cost';
	const gainKey = 'synthetic:gain';
	const costResourceId = 'resource:synthetic:cost';
	const gainResourceId = 'resource:synthetic:gain';
	const { resources: resourceCatalogResources, groups: resourceCatalogGroups } =
		createResourceV2Registries({
			resources: [
				resourceV2Definition({
					id: costResourceId,
					metadata: {
						label: 'Synthetic Action Cost',
						icon: '⚡',
						description:
							'Action points allocated to synthetic session commands.',
						order: 0,
					},
					bounds: { lowerBound: 0 },
				}),
				resourceV2Definition({
					id: gainResourceId,
					metadata: {
						label: 'Synthetic Gain',
						icon: '🪙',
						description: 'Rewards granted by synthetic session resolutions.',
						order: 1,
					},
					bounds: { lowerBound: 0 },
				}),
			],
		});
	const resourceCatalogV2 = {
		resources: resourceCatalogResources,
		groups: resourceCatalogGroups,
	};
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
			valuesV2: {
				[costResourceId]: 1,
				[gainResourceId]: 0,
			},
			resourceLowerBoundsV2: {
				[costResourceId]: 0,
				[gainResourceId]: 0,
			},
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
	const defaultPrimaryIconId = gainKey;
	const engineOptions: NonNullable<SessionManagerOptions['engineOptions']> = {
		actions: engineOverrides.actions ?? factory.actions,
		actionCategories: engineOverrides.actionCategories ?? factory.categories,
		buildings: engineOverrides.buildings ?? factory.buildings,
		developments: engineOverrides.developments ?? factory.developments,
		populations: engineOverrides.populations ?? factory.populations,
		phases: engineOverrides.phases ?? phases,
		start: engineOverrides.start ?? start,
		rules: engineOverrides.rules ?? rules,
		resourceRegistry: engineOverrides.resourceRegistry ?? {
			[costKey]: { key: costKey },
			[gainKey]: { key: gainKey },
		},
		resourceCatalogV2: engineOverrides.resourceCatalogV2 ?? resourceCatalogV2,
		primaryIconId: engineOverrides.primaryIconId ?? defaultPrimaryIconId,
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
