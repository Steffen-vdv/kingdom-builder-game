import type { SessionRequirementFailure } from '@kingdom-builder/protocol';
import type { createContentFactory } from '@kingdom-builder/testing';
import {
	compareRequirement,
	populationEvaluator,
	statEvaluator,
} from '../evaluators';
import type { ActionsPanelGameOptions } from '../actionsPanel.types';

interface ActionCategories {
	readonly population: string;
	readonly basic: string;
	readonly building: string;
}

interface BuildActionsPanelContentOptions {
	readonly categories: ActionCategories;
	readonly populationPlaceholder: string;
	readonly capacityStat: string;
	readonly showBuilding: boolean;
	readonly upkeepResource: string;
	readonly actionCostResource: string;
	readonly populationRoles?: ActionsPanelGameOptions['populationRoles'];
	readonly requirementBuilder?: ActionsPanelGameOptions['requirementBuilder'];
	readonly factory: ReturnType<typeof createContentFactory>;
}

type ContentFactory = ReturnType<typeof createContentFactory>;
type ActionDefinition = ReturnType<ContentFactory['action']>;
type BuildingDefinition = ReturnType<ContentFactory['building']>;
type PopulationDefinition = ReturnType<ContentFactory['population']>;

export interface ActionsPanelContent {
	readonly registeredPopulationRoles: PopulationDefinition[];
	readonly passivePopulation: PopulationDefinition;
	readonly buildRequirements: unknown[];
	readonly raisePopulationAction: ActionDefinition;
	readonly basicAction: ActionDefinition;
	readonly buildingAction?: ActionDefinition;
	readonly buildingDefinition?: BuildingDefinition;
	readonly initialPopulation: Record<string, number>;
	readonly actionIds: string[];
	readonly requirementFailures: Map<string, SessionRequirementFailure[]>;
	readonly requirementIcons: Map<string, string[]>;
	readonly costMap: Map<string, Record<string, number>>;
}

export function buildActionsPanelContent({
	categories,
	populationPlaceholder,
	capacityStat,
	showBuilding,
	upkeepResource,
	actionCostResource,
	populationRoles,
	requirementBuilder,
	factory,
}: BuildActionsPanelContentOptions): ActionsPanelContent {
	const defaultPopulationRoles = populationRoles?.length
		? populationRoles
		: [
				{
					name: 'Council Role',
					icon: '⚖️',
					upkeep: { [upkeepResource]: 1 },
					onAssigned: [{}],
				},
				{
					name: 'Legion Role',
					upkeep: { [upkeepResource]: 1 },
					onAssigned: [{}],
				},
			];
	const registeredPopulationRoles = defaultPopulationRoles.map((definition) =>
		factory.population(definition),
	);
	const passivePopulation = factory.population({
		name: 'Passive Role',
		icon: '👤',
	});
	const buildRequirements = requirementBuilder
		? requirementBuilder({ capacityStat, populationPlaceholder })
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
	let buildingAction: ActionDefinition | undefined;
	let buildingDefinition: BuildingDefinition | undefined;
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
	const requirementFailures = new Map<string, SessionRequirementFailure[]>();
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
	const costMap = new Map(
		actionIds.map((id) => [id, { [actionCostResource]: 1 }]),
	) as Map<string, Record<string, number>>;
	return {
		registeredPopulationRoles,
		passivePopulation,
		buildRequirements,
		raisePopulationAction,
		basicAction,
		buildingAction,
		buildingDefinition,
		initialPopulation,
		actionIds,
		requirementFailures,
		requirementIcons,
		costMap,
	};
}
