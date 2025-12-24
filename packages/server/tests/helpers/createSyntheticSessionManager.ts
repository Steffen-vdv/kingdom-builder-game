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
import { SystemRole } from '@kingdom-builder/contents-sdk';
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
	// Use isolated mode to avoid loading real content that expects command-points
	const factory = createContentFactory({ isolated: true });
	const costResourceId = 'resource:synthetic:cost';
	const gainResourceId = 'resource:synthetic:gain';
	// Create Resource definitions for the synthetic resources
	// Include a percent resource to satisfy expectStaticMetadata checks
	const percentResourceId = 'resource:synthetic:percent';
	// Include command-points for action cost model
	const cpResourceId = 'resource:core:command-points';
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
			resourceDefinition({
				id: cpResourceId,
				metadata: { label: 'Command Points', icon: '⚡' },
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

	// Create synthetic building and development for tests that expect them
	factory.building({
		id: 'building:synthetic:test',
		icon: '🏠',
		costs: { [costResourceId]: 1 },
	});
	factory.development({
		id: 'development:synthetic:test',
		icon: '🌱',
	});

	// Create synthetic system actions for initial setup with systemRole
	// These give players the initial resources defined in the start config
	const initialSetupActionId = '__synth_initial_setup__';
	const compensationActionId = '__synth_compensation__';

	// Initial setup action gives players starting resources
	factory.actions.add(initialSetupActionId, {
		id: initialSetupActionId,
		name: 'Synthetic Initial Setup',
		metaCategory: 'meta:commands',
		system: true,
		systemRole: SystemRole.INITIAL_SETUP,
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
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: cpResourceId,
					change: { type: 'amount', amount: 5 },
				},
			},
		],
	});

	// Compensation action (empty for synthetic tests)
	factory.actions.add(compensationActionId, {
		id: compensationActionId,
		name: 'Synthetic Compensation',
		metaCategory: 'meta:commands',
		system: true,
		systemRole: SystemRole.COMPENSATION,
		free: true,
		baseCosts: {},
		effects: [],
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
		phases: engineOverrides.phases ?? phases,
		rules: engineOverrides.rules ?? rules,
		resourceCatalog: engineOverrides.resourceCatalog ?? {
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
