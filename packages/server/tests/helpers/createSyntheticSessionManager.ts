import { SessionManager } from '../../src/session/SessionManager.js';
import type { SessionManagerOptions } from '../../src/session/SessionManager.js';
import {
	createContentFactory,
	createResourceRegistries,
	resourceDefinition,
} from '@kingdom-builder/testing';
import type { EngineSession } from '@kingdom-builder/engine';
import {
	happinessTier,
	effect,
	passiveParams,
	Types,
	PassiveMethods,
} from '@kingdom-builder/contents';
import type { PhaseConfig, RuleSet } from '@kingdom-builder/protocol';
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
	rules: RuleSet;
	primaryIconId: string | null;
}

export function createSyntheticSessionManager(
	options: SyntheticSessionManagerOptions = {},
): SyntheticSessionManagerResult {
	const factory = createContentFactory();
	const costResourceId = 'resource:synthetic:cost';
	const gainResourceId = 'resource:synthetic:gain';
	// Create Resource definitions for the synthetic resources
	// Include a percent resource to satisfy expectStaticMetadata checks
	const percentResourceId = 'resource:synthetic:percent';
	const { resources, groups } = createResourceRegistries({
		resources: [
			resourceDefinition({
				id: costResourceId,
				metadata: { label: 'Cost', icon: '💰' },
				bounds: { lowerBound: 0 },
			}),
			resourceDefinition({
				id: gainResourceId,
				metadata: { label: 'Gain', icon: '⭐' },
				bounds: { lowerBound: 0 },
			}),
			resourceDefinition({
				id: percentResourceId,
				metadata: { label: 'Percent', icon: '📊', displayAsPercent: true },
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

	// Create synthetic system actions for initial setup
	// These give players the initial resources defined in the start config
	const initialSetupActionId = '__synth_initial_setup__';
	const initialSetupDevmodeActionId = '__synth_initial_setup_devmode__';
	const compensationActionId = '__synth_compensation__';

	// Initial setup action gives players starting resources
	factory.actions.add(initialSetupActionId, {
		id: initialSetupActionId,
		name: 'Synthetic Initial Setup',
		system: true,
		free: true,
		baseCosts: {},
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
	});

	// DevMode setup (same as normal for synthetic tests)
	factory.actions.add(initialSetupDevmodeActionId, {
		id: initialSetupDevmodeActionId,
		name: 'Synthetic Initial Setup (DevMode)',
		system: true,
		free: true,
		baseCosts: {},
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
	});

	// Compensation actions (empty for synthetic tests)
	factory.actions.add(compensationActionId, {
		id: compensationActionId,
		name: 'Synthetic Compensation',
		system: true,
		free: true,
		baseCosts: {},
		effects: [],
	});

	const systemActionIds = {
		initialSetup: initialSetupActionId,
		initialSetupDevmode: initialSetupDevmodeActionId,
		compensation: compensationActionId,
	};
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
		rules: engineOverrides.rules ?? rules,
		resourceCatalog: engineOverrides.resourceCatalog ?? {
			resources,
			groups,
		},
		primaryIconId: engineOverrides.primaryIconId ?? defaultPrimaryIconId,
		systemActionIds,
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
