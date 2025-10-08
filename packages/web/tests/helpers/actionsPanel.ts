import {
	POPULATION_INFO,
	POPULATION_ROLES,
	PhaseId,
	Resource,
	Stat,
	type PopulationRoleId,
} from '@kingdom-builder/contents';
import { createContentFactory } from '../../../engine/tests/factories/content';
import { Registry } from '@kingdom-builder/engine/registry';
import { createActionsPanelState } from './createActionsPanelState';
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

function createRegistry<T extends { id: string }>(items: T[]) {
	const registry = new Registry<T>();
	for (const item of items) {
		registry.add(item.id, item);
	}
	return registry;
}

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
	const initialPopulation = [
		...registeredPopulationRoles,
		passivePopulation,
	].reduce<Record<string, number>>((acc, population) => {
		acc[population.id] = 0;
		return acc;
	}, {});
	const actionIds = [raisePopulationAction, basicAction, buildingAction]
		.filter(Boolean)
		.map((action) => action!.id);
	const baseResources = { [actionCostResource]: 3, [upkeepResource]: 10 };
	const createParticipant = (
		id: string,
		name: string,
		actionList: string[],
	) => ({
		id,
		name,
		resources: { ...baseResources },
		population: { ...initialPopulation },
		lands: [] as { id: string; slotsFree: number }[],
		buildings: new Set<string>(),
		actions: new Set(actionList),
	});
	const player = createParticipant('A', 'Player', actionIds);
	const opponent = createParticipant('B', 'Opponent', []);

	const costMap = new Map<string, Record<string, number>>(
		actionIds.map((id) => [id, { [actionCostResource]: 1 }]),
	);

	const requirementMessages = new Map<string, string[]>([
		[
			raisePopulationAction.id,
			['Requires available housing', 'Requires open role slot'],
		],
	]);
	if (buildingAction) {
		requirementMessages.set(buildingAction.id, ['Requires assigned worker']);
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
	const populationRegistry = createRegistry([
		...registeredPopulationRoles,
		passivePopulation,
	]);
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

	return {
		ctx: {
			actions: actionsRegistry,
			buildings: buildingsRegistry,
			developments: developmentsRegistry,
			populations: populationRegistry,
			game: {
				players: [player, opponent],
				currentPhase: PhaseId.Main,
				currentStep: '',
				outcome: { status: 'ongoing' },
			},
			activePlayer: player,
			actionCostResource,
			phases: [{ id: PhaseId.Main, action: true, steps: [] }],
		},
		translationContext,
		...createActionsPanelState(actionCostResource),
		metadata: {
			upkeepResource,
			capacityStat,
			actions: {
				raise: raisePopulationAction,
				basic: basicAction,
				building: buildingAction,
			},
			populationRoles: registeredPopulationRoles,
			costMap,
			requirementMessages,
			requirementIcons,
			populationInfoIcon: POPULATION_INFO.icon,
			building: buildingDefinition,
		},
	};
}
