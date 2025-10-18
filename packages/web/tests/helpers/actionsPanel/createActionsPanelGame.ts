import { vi } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import type { EngineSessionSnapshot } from '@kingdom-builder/engine';
import type {
	ActionEffectGroup,
	PlayerStartConfig,
} from '@kingdom-builder/protocol';
import type { GameApi } from '../../../src/services/gameApi';
import type { SessionRegistries } from '../../../src/state/sessionRegistries';
import { RemoteSessionAdapter } from '../../../src/state/remoteSessionAdapter';
import { selectSessionView } from '../../../src/state/sessionSelectors';
import type {
	ActionsPanelGameOptions,
	ActionsPanelTestHarness,
} from '../actionsPanel.types';
import { createActionsPanelState } from '../createActionsPanelState';
import { createRegistry } from '../createRegistry';
import { createSessionRegistries } from '../sessionRegistries';
import {
	createTranslationContextStub,
	toTranslationPlayer,
	wrapTranslationRegistry,
} from '../translationContextStub';
import { buildActionsPanelContent } from './contentBuilders';
import {
	createPopulationDescriptors,
	createResourceDescriptors,
	createSlotDescriptor,
} from './descriptors';
import { createStatMetadata, humanizeId } from './statMetadata';

const POPULATION_ICON_FALLBACK = '👥';

interface ResourceSelectionContext {
	readonly registries: SessionRegistries;
	readonly usedResourceKeys: Set<string>;
}

interface Participant {
	readonly id: string;
	readonly name: string;
	readonly resources: Record<string, number>;
	readonly population: Record<string, number>;
	readonly lands: Array<{ id: string; slotsFree: number }>;
	readonly buildings: Set<string>;
	readonly actions: Set<string>;
}

function pickResourceKey(
	context: ResourceSelectionContext,
	requested: string | undefined,
	label: string,
): string {
	const { registries, usedResourceKeys } = context;
	if (requested && registries.resources[requested]) {
		usedResourceKeys.add(requested);
		return requested;
	}
	const available = Object.keys(registries.resources).find(
		(key) => !usedResourceKeys.has(key),
	);
	if (available) {
		usedResourceKeys.add(available);
		return available;
	}
	const fallback = requested ?? `${label}-${usedResourceKeys.size}`;
	if (!registries.resources[fallback]) {
		registries.resources[fallback] = { key: fallback };
	}
	usedResourceKeys.add(fallback);
	return fallback;
}

function createParticipant(
	id: string,
	name: string,
	baseResources: Record<string, number>,
	initialPopulation: Record<string, number>,
	actionIds: string[],
): Participant {
	return {
		id,
		name,
		resources: { ...baseResources },
		population: { ...initialPopulation },
		lands: [],
		buildings: new Set<string>(),
		actions: new Set(actionIds),
	};
}

function toPlayerSnapshot(
	participant: Participant,
	capacityStat: string,
): EngineSessionSnapshot['game']['players'][number] {
	return {
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
	};
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
	const resourceSelection: ResourceSelectionContext = {
		registries: sessionRegistries,
		usedResourceKeys: new Set<string>(),
	};
	const actionCostResource = pickResourceKey(
		resourceSelection,
		resourceKeys?.actionCost,
		'action-cost',
	);
	const upkeepResource = pickResourceKey(
		resourceSelection,
		resourceKeys?.upkeep,
		'upkeep',
	);
	const tieredResourceKey = pickResourceKey(
		resourceSelection,
		undefined,
		'tiered',
	);
	const { capacityStat, entries: statMetadataEntries } = createStatMetadata(
		sessionRegistries,
		statKeys?.capacity,
	);
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
	const content = buildActionsPanelContent({
		categories,
		populationPlaceholder,
		capacityStat,
		showBuilding,
		upkeepResource,
		actionCostResource,
		populationRoles,
		requirementBuilder,
		factory,
	});
	const baseResources = {
		[actionCostResource]: 3,
		[upkeepResource]: 10,
	};
	const player = createParticipant(
		'A',
		'Player',
		baseResources,
		content.initialPopulation,
		content.actionIds,
	);
	const opponent = createParticipant(
		'B',
		'Opponent',
		baseResources,
		content.initialPopulation,
		[],
	);
	const actionDefinitions = [
		content.raisePopulationAction,
		content.basicAction,
		content.buildingAction,
	].filter(Boolean) as ReturnType<typeof factory.action>[];
	const actionsRegistry = createRegistry(actionDefinitions);
	const buildingsRegistry = createRegistry(
		content.buildingDefinition ? [content.buildingDefinition] : [],
	);
	const developmentsRegistry = createRegistry<{ id: string }>([]);
	const populationsRegistry = createRegistry(content.registeredPopulationRoles);
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
	const playerSnapshot = toPlayerSnapshot(player, capacityStat);
	const opponentSnapshot = toPlayerSnapshot(opponent, capacityStat);
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
		metadata: { passiveEvaluationModifiers: {} },
	};
	sessionRegistries.actions = actionsRegistry;
	sessionRegistries.buildings = buildingsRegistry;
	sessionRegistries.developments = developmentsRegistry;
	sessionRegistries.populations = populationsRegistry;
	const sessionView = selectSessionView(sessionState, sessionRegistries);
	const resourceDescriptors = createResourceDescriptors(sessionRegistries);
	const populationDescriptors = createPopulationDescriptors(
		content.registeredPopulationRoles,
	);
	const slotDescriptor = createSlotDescriptor();
	const metadata = {
		upkeepResource,
		capacityStat,
		actions: {
			raise: content.raisePopulationAction,
			basic: content.basicAction,
			building: content.buildingAction,
		},
		populationRoles: content.registeredPopulationRoles,
		costMap: content.costMap,
		requirementFailures: content.requirementFailures,
		requirementIcons: content.requirementIcons,
		defaultPopulationIcon:
			content.registeredPopulationRoles.find((entry) => entry.icon)?.icon ??
			POPULATION_ICON_FALLBACK,
		building: content.buildingDefinition,
	} as const;
	const actionOptions = new Map<string, ActionEffectGroup[]>();
	const sessionId = 'actions-panel-session';
	const session = new RemoteSessionAdapter(sessionId, {
		ensureGameApi: vi.fn(() => ({}) as GameApi),
		runAiTurn: vi.fn().mockResolvedValue({
			sessionId,
			snapshot: sessionState,
			registries: sessionRegistries,
			ranTurn: false,
		}),
	});
	for (const [actionId, costs] of metadata.costMap.entries()) {
		session.setActionCosts(actionId, costs);
	}
	for (const [actionId, failures] of metadata.requirementFailures.entries()) {
		session.setActionRequirements(actionId, failures);
	}
	sessionState.metadata = {
		passiveEvaluationModifiers: {},
		resources: resourceDescriptors,
		populations: populationDescriptors,
		stats: Object.fromEntries(statMetadataEntries),
		assets: { slot: slotDescriptor },
	};
	return {
		sessionId,
		session,
		sessionState,
		selectors: { sessionView },
		translationContext,
		ruleSnapshot,
		...createActionsPanelState({
			actionCostResource,
			phaseId: phaseDefinition.id,
		}),
		metadata,
		sessionRegistries,
		actionOptions,
		sessionView,
	};
}
