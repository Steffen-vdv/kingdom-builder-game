/* eslint-disable max-lines */
import { type PlayerStartConfig } from '@kingdom-builder/protocol';
import { vi } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
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
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createTestMetadata } from './sessionFixtures';

const POPULATION_ICON_FALLBACK = '👥';

function humanizeId(identifier: string): string {
	return identifier
		.split(/[-_.\s]+/u)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function collectStatKeysFromValue(value: unknown, keys: Set<string>): void {
	if (Array.isArray(value)) {
		for (const entry of value) {
			collectStatKeysFromValue(entry, keys);
		}
		return;
	}
	if (!value || typeof value !== 'object') {
		return;
	}
	const record = value as Record<string, unknown>;
	if (record.type === 'stat') {
		const params = record.params as { key?: unknown } | undefined;
		if (params && typeof params.key === 'string') {
			keys.add(params.key);
		}
	}
	for (const nested of Object.values(record)) {
		if (nested && typeof nested === 'object') {
			collectStatKeysFromValue(nested, keys);
		}
	}
}

function deriveStatKeys(registries: SessionRegistries): string[] {
	const keys = new Set<string>();
	const scanRegistry = <T>(registry: { entries(): [string, T][] }) => {
		for (const [, definition] of registry.entries()) {
			collectStatKeysFromValue(definition, keys);
		}
	};
	scanRegistry(registries.actions);
	scanRegistry(registries.buildings);
	scanRegistry(registries.developments);
	scanRegistry(registries.populations);
	return Array.from(keys);
}

function selectCapacityStat(
	derivedStatKeys: string[],
	provided?: string,
): string {
	if (provided) {
		return provided;
	}
	const lowerCaseMatch = (candidate: string, fragments: readonly string[]) => {
		const lowered = candidate.toLowerCase();
		return fragments.some((fragment) => lowered.includes(fragment));
	};
	const prioritized = derivedStatKeys.find((key) =>
		lowerCaseMatch(key, ['population', 'capacity', 'cap']),
	);
	if (prioritized) {
		return prioritized;
	}
	return derivedStatKeys[0] ?? 'stat.capacity';
}

function createStatDescriptor(statId: string, index: number) {
	const label = humanizeId(statId);
	return {
		id: statId,
		label,
		icon: index === 0 ? '📊' : undefined,
		description: `${label} descriptor`,
	} as const;
}

export function createActionsPanelGame({
	populationRoles,
	showBuilding = false,
	actionCategories: providedCategories,
	requirementBuilder,
	resourceKeys,
	statKeys,
	placeholders,
}: ActionsPanelGameOptions = {}): ActionsPanelTestHarness {
	const sessionRegistries = createSessionRegistries();
	const resourceOrder = Object.keys(sessionRegistries.resources);
	const usedResourceKeys = new Set<string>();
	const pickResourceKey = (requested: string | undefined, label: string) => {
		if (requested && sessionRegistries.resources[requested]) {
			usedResourceKeys.add(requested);
			return requested;
		}
		const available = resourceOrder.find((key) => !usedResourceKeys.has(key));
		if (available) {
			usedResourceKeys.add(available);
			return available;
		}
		const fallback = requested ?? `${label}-${usedResourceKeys.size}`;
		if (!sessionRegistries.resources[fallback]) {
			sessionRegistries.resources[fallback] = { key: fallback };
		}
		usedResourceKeys.add(fallback);
		return fallback;
	};
	const actionCostResource = pickResourceKey(
		resourceKeys?.actionCost,
		'action-cost',
	);
	const upkeepResource = pickResourceKey(resourceKeys?.upkeep, 'upkeep');
	const tieredResourceKey = pickResourceKey(undefined, 'tiered');
	const derivedStatKeys = deriveStatKeys(sessionRegistries);
	const capacityStat = selectCapacityStat(derivedStatKeys, statKeys?.capacity);
	const statMetadataEntries = derivedStatKeys.map(
		(statId, index) => [statId, createStatDescriptor(statId, index)] as const,
	);
	if (!derivedStatKeys.includes(capacityStat)) {
		statMetadataEntries.push([
			capacityStat,
			createStatDescriptor(capacityStat, derivedStatKeys.length),
		]);
	}
	const categories = {
		population: providedCategories?.population ?? 'population',
		basic: providedCategories?.basic ?? 'basic',
		building: providedCategories?.building ?? 'building',
	} as const;
	const actionPhaseId = `phase.${categories.basic}`;
	const phaseLabel = `${humanizeId(categories.basic)} Phase`;
	const populationPlaceholder = placeholders?.population ?? '$role';

	const upkeepDefinition = sessionRegistries.resources[upkeepResource];
	if (upkeepDefinition) {
		delete upkeepDefinition.icon;
		delete upkeepDefinition.label;
	}

	const factory = createContentFactory();
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
	const baseResources = {
			[actionCostResource]: 3,
			[upkeepResource]: 10,
		},
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
	const populationsRegistry = createRegistry(registeredPopulationRoles);

	const translationContext = createTranslationContextStub({
		actions: wrapTranslationRegistry(actionsRegistry),
		buildings: wrapTranslationRegistry(buildingsRegistry),
		developments: wrapTranslationRegistry(developmentsRegistry),
		populations: wrapTranslationRegistry(populationsRegistry),
		phases: [
			{
				id: actionPhaseId,
				name: phaseLabel,
				action: true,
			},
		],
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
		tieredResourceKey,
		tierDefinitions: [],
		winConditions: [],
	} as const;

	const phaseDefinition = {
		id: actionPhaseId,
		name: phaseLabel,
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
			currentPhase: phaseDefinition.id,
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
		metadata: createTestMetadata(),
	};

	sessionRegistries.actions = actionsRegistry;
	sessionRegistries.buildings = buildingsRegistry;
	sessionRegistries.developments = developmentsRegistry;
	sessionRegistries.populations = populationsRegistry;

	const sessionView = selectSessionView(sessionState, sessionRegistries);

	const resourceDescriptors = Object.fromEntries(
		Object.entries(sessionRegistries.resources).map(([key, definition]) => [
			key,
			{
				id: key,
				label: definition.label ?? humanizeId(key),
				icon: definition.icon,
				description: definition.description,
			},
		]),
	);
	const populationDescriptors = Object.fromEntries(
		registeredPopulationRoles.map((definition) => [
			definition.id,
			{
				id: definition.id,
				label: definition.name,
				icon: definition.icon,
			},
		]),
	);
	const slotDescriptor = {
		id: 'slot',
		label: 'Land Slot',
		icon: '🧱',
	} as const;
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
		defaultPopulationIcon:
			registeredPopulationRoles.find((entry) => entry.icon)?.icon ??
			POPULATION_ICON_FALLBACK,
		building: buildingDefinition,
	} as const;

	const session = {
		getActionCosts: vi.fn((actionId: string) => {
			return metadata.costMap.get(actionId) ?? {};
		}),
		getActionRequirements: vi.fn((actionId: string) => {
			return metadata.requirementFailures.get(actionId) ?? [];
		}),
		getActionOptions: vi.fn(() => []),
	} as const;

	sessionState.metadata = createTestMetadata({
		resources: resourceDescriptors,
		populations: populationDescriptors,
		stats: Object.fromEntries(statMetadataEntries),
		assets: { slot: slotDescriptor },
	});

	return {
		session,
		sessionState,
		sessionView,
		translationContext,
		ruleSnapshot,
		...createActionsPanelState({
			actionCostResource,
			phaseId: phaseDefinition.id,
		}),
		metadata,
		sessionRegistries,
	};
}
