/* eslint-disable no-max-lines-override */
import {
	POPULATION_INFO,
	POPULATION_ROLES,
	PhaseId,
	Resource,
	Stat,
	type PopulationRoleId,
} from '@kingdom-builder/contents';
import { type PlayerStartConfig } from '@kingdom-builder/protocol';
import { vi } from 'vitest';
import { createContentFactory } from '../../../engine/tests/factories/content';
import type {
	EngineSessionSnapshot,
	RequirementFailure,
} from '@kingdom-builder/engine';
import { createActionsPanelState } from './createActionsPanelState';
import { createRegistry } from './createRegistry';
import {
	compareRequirement,
	populationEvaluator,
	statEvaluator,
} from './evaluators';
import type {
	ActionsPanelGameOptions,
	ActionsPanelTestHarness,
} from './actionsPanel.types';
import {
	createTranslationContextStub,
	toTranslationPlayer,
	wrapTranslationRegistry,
} from './translationContextStub';
import { selectSessionView } from '../../src/state/sessionSelectors';
import type { SessionRegistries } from '../../src/state/sessionContent';

export function createActionsPanelGame({
	populationRoles,
	showBuilding = false,
	actionCategories: providedCategories,
	requirementBuilder,
	resourceKeys,
	statKeys,
}: ActionsPanelGameOptions = {}): ActionsPanelTestHarness {
	const categories = {
		population: providedCategories?.population ?? 'population',
		basic: providedCategories?.basic ?? 'basic',
		building: providedCategories?.building ?? 'building',
	} as const;
	const actionCostResource = resourceKeys?.actionCost ?? Resource.ap;
	const upkeepResource = resourceKeys?.upkeep ?? Resource.gold;
	const capacityStat = statKeys?.capacity ?? Stat.populationCap;
	const factory = createContentFactory();
	const defaultPopulationRoles = populationRoles?.length
		? populationRoles
		: Object.keys(POPULATION_ROLES)
				.slice(0, 2)
				.map((key, index) => ({
					name: index === 0 ? 'Council Role' : 'Legion Role',
					icon:
						POPULATION_ROLES[key as PopulationRoleId]?.icon ??
						(index === 0 ? '⚖️' : '🎖️'),
					upkeep: { [upkeepResource]: 1 },
					onAssigned: [{}],
				}));
	const registeredPopulationRoles = defaultPopulationRoles.map((def) =>
		factory.population(def),
	);
	const passivePopulation = factory.population({
		name: 'Passive Role',
		icon:
			POPULATION_ROLES[Object.keys(POPULATION_ROLES)[3] as PopulationRoleId]
				?.icon ?? '👤',
	});
	const populationPlaceholder = '$role';
	const buildRequirements = requirementBuilder
		? requirementBuilder({
				capacityStat,
				populationPlaceholder,
			})
		: [
				compareRequirement(populationEvaluator(), statEvaluator(capacityStat)),
				compareRequirement(
					populationEvaluator(populationPlaceholder),
					populationEvaluator(populationPlaceholder),
				),
			];
	const raisePopulationAction = factory.action({
		name: 'Hire',
		icon: '👶',
		requirements: buildRequirements,
		effects: [
			{
				type: 'population',
				method: 'add',
				params: { role: populationPlaceholder },
			},
		],
	});
	Object.assign(raisePopulationAction, {
		category: categories.population,
		order: 1,
		focus: 'economy',
	});
	const basicAction = factory.action({
		name: 'Survey',
		icon: '✨',
		requirements: [],
		effects: [],
	});
	Object.assign(basicAction, {
		category: categories.basic,
		order: 2,
		focus: 'other',
	});
	let buildingAction: ReturnType<typeof factory.action> | undefined;
	let buildingDefinition: ReturnType<typeof factory.building> | undefined;
	if (showBuilding) {
		buildingAction = factory.action({
			name: 'Construct',
			icon: '🏛️',
			requirements: [],
			effects: [],
		});
		Object.assign(buildingAction, {
			category: categories.building,
			order: 3,
			focus: 'other',
		});
		buildingDefinition = factory.building({
			name: 'Great Hall',
			icon: '🏰',
			costs: { [upkeepResource]: 5 },
		});
	}
	const initialPopulation = Object.fromEntries(
		[...registeredPopulationRoles, passivePopulation].map((population) => [
			population.id,
			0,
		]),
	) as Record<string, number>;
	const actionIds = [raisePopulationAction, basicAction, buildingAction]
		.filter(Boolean)
		.map((action) => action!.id);
	const baseResources = { [actionCostResource]: 3, [upkeepResource]: 10 },
		createParticipant = (id: string, name: string, actionList: string[]) => ({
			id,
			name,
			resources: { ...baseResources },
			population: { ...initialPopulation },
			lands: [] as { id: string; slotsFree: number }[],
			buildings: new Set<string>(),
			actions: new Set(actionList),
		});
	const [player, opponent] = [
		createParticipant('A', 'Player', actionIds),
		createParticipant('B', 'Opponent', []),
	];

	const requirementFailures = new Map<string, RequirementFailure[]>();
	requirementFailures.set(
		raisePopulationAction.id,
		buildRequirements.map((requirement, index) => ({
			requirement,
			details: {
				left: index === 0 ? 3 : 1,
				right: index === 0 ? 3 : 0,
			},
		})),
	);
	if (buildingAction) {
		requirementFailures.set(buildingAction.id, [
			{
				requirement: buildRequirements[0]!,
				details: {
					left: 3,
					right: 3,
				},
			},
		]);
	}

	const requirementIcons = new Map<string, string[]>([
		[raisePopulationAction.id, []],
	]);
	if (buildingAction) {
		requirementIcons.set(buildingAction.id, ['🛠️']);
	}

	const actionsRegistry = createRegistry(
		[raisePopulationAction, basicAction, buildingAction].filter(
			Boolean,
		) as ReturnType<typeof factory.action>[],
	);
	const buildingsRegistry = createRegistry(
		buildingDefinition ? [buildingDefinition] : [],
	);
	const developmentsRegistry = createRegistry<{ id: string }>([]);

	const translationContext = createTranslationContextStub({
		actions: wrapTranslationRegistry(actionsRegistry),
		buildings: wrapTranslationRegistry(buildingsRegistry),
		developments: wrapTranslationRegistry(developmentsRegistry),
		phases: [{ id: PhaseId.Main }],
		activePlayer: toTranslationPlayer({
			id: player.id,
			name: player.name,
			resources: player.resources,
			population: player.population,
		}),
		opponent: toTranslationPlayer({
			id: opponent.id,
			name: opponent.name,
			resources: opponent.resources,
			population: opponent.population,
		}),
		actionCostResource,
	});

	const ruleSnapshot = {
		tieredResourceKey: Resource.happiness,
		tierDefinitions: [],
		winConditions: [],
	} as const;

	const phaseDefinition = {
		id: PhaseId.Main,
		name: 'Main Phase',
		action: true,
		steps: [],
	} as const;

	const toPlayerSnapshot = (
		participant: ReturnType<typeof createParticipant>,
	) => ({
		id: participant.id,
		name: participant.name,
		resources: { ...participant.resources },
		stats: { [capacityStat]: 3 },
		statsHistory: {},
		population: { ...participant.population },
		lands: participant.lands.map((land) => ({
			...land,
			slotsMax: land.slotsFree,
			slotsUsed: 0,
			tilled: false,
			developments: [],
		})),
		buildings: Array.from(participant.buildings),
		actions: Array.from(participant.actions),
		statSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
	});

	const playerSnapshot = toPlayerSnapshot(player);
	const opponentSnapshot = toPlayerSnapshot(opponent);

	const sessionState: EngineSessionSnapshot = {
		game: {
			turn: 1,
			currentPlayerIndex: 0,
			currentPhase: PhaseId.Main,
			currentStep: '',
			phaseIndex: 0,
			stepIndex: 0,
			devMode: false,
			players: [playerSnapshot, opponentSnapshot],
			activePlayerId: player.id,
			opponentId: opponent.id,
		},
		phases: [phaseDefinition],
		actionCostResource,
		recentResourceGains: [],
		compensations: {} as Record<string, PlayerStartConfig>,
		rules: ruleSnapshot,
		passiveRecords: {
			[player.id]: [],
			[opponent.id]: [],
		},
	};

	const sessionRegistries: SessionRegistries = {
		actions: actionsRegistry,
		buildings: buildingsRegistry,
		developments: developmentsRegistry,
	};

	const sessionView = selectSessionView(sessionState, sessionRegistries);

	const metadata = {
		upkeepResource,
		capacityStat,
		actions: {
			raise: raisePopulationAction,
			basic: basicAction,
			building: buildingAction,
		},
		populationRoles: registeredPopulationRoles,
		costMap: new Map(
			actionIds.map((id) => [id, { [actionCostResource]: 1 }]),
		) as Map<string, Record<string, number>>,
		requirementFailures,
		requirementIcons,
		populationInfoIcon: POPULATION_INFO.icon,
		building: buildingDefinition,
	} as const;

	const getActionCosts = vi.fn((actionId: string) => {
		return metadata.costMap.get(actionId) ?? {};
	});
	const getActionRequirements = vi.fn((actionId: string) => {
		return metadata.requirementFailures.get(actionId) ?? [];
	});
	const getActionOptions = vi.fn(() => []);

	return {
		sessionState,
		sessionView,
		translationContext,
		ruleSnapshot,
		...createActionsPanelState(actionCostResource),
		getActionCosts,
		getActionRequirements,
		getActionOptions,
		metadata,
	};
}
