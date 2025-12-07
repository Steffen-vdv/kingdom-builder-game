import { vi } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import type {
	ActionEffectGroup,
	PlayerStartConfig,
} from '@kingdom-builder/protocol';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
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
import { wrapActionCategoryRegistry } from '../../../src/translation/context/contextHelpers';
import { resolveActionCategoryIds } from './categorySelectors';
import { createEmptySnapshotMetadata } from '../sessionFixtures';
import { buildActionsPanelContent } from './contentBuilders';
import {
	createLandDescriptor,
	createPassiveDescriptor,
	createPopulationDescriptors,
	createResourceDescriptors,
	createSlotDescriptor,
} from './descriptors';
import { createStatMetadata, humanizeId } from './statMetadata';
import { initializeSessionState } from '../../../src/state/sessionStateStore';
import { toRegistriesPayload } from './registriesPayload';

const POPULATION_ICON_FALLBACK = '👥';

interface ResourceSelectionContext {
	readonly registries: SessionRegistries;
	readonly usedResourceKeys: Set<string>;
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
) {
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
	participant: ReturnType<typeof createParticipant>,
	capacityStat: string,
): SessionSnapshot['game']['players'][number] {
	return {
		id: participant.id,
		name: participant.name,
		valuesV2: {
			...participant.resources,
			...participant.population,
			[capacityStat]: 3,
		},
		resourceTouchedV2: {},
		resourceBoundsV2: {},
		lands: participant.lands.map((land) => ({
			...land,
			slotsMax: land.slotsFree,
			slotsUsed: 0,
			tilled: false,
			developments: [],
		})),
		buildings: Array.from(participant.buildings),
		actions: Array.from(participant.actions),
		resourceSources: {},
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
	const categories = resolveActionCategoryIds(
		sessionRegistries.actionCategories,
		providedCategories,
	);
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
		actionCategories: wrapActionCategoryRegistry(
			sessionRegistries.actionCategories,
		),
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
			valuesV2: {
				...player.resources,
				...player.population,
			},
		}),
		opponent: toTranslationPlayer({
			id: opponent.id,
			name: opponent.name,
			valuesV2: {
				...opponent.resources,
				...opponent.population,
			},
		}),
		actionCostResource,
	});
	const ruleSnapshot = {
		tieredResourceKey, tierDefinitions: [], winConditions: [],
	} as const;
	const phaseDefinition = {
		id: actionPhaseId, name: phaseLabel, action: true, steps: [],
	} as const;
	const playerSnapshot = toPlayerSnapshot(player, capacityStat);
	const opponentSnapshot = toPlayerSnapshot(opponent, capacityStat);
	const sessionState: SessionSnapshot = {
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
		metadata: createEmptySnapshotMetadata(),
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
	const landDescriptor = createLandDescriptor();
	const slotDescriptor = createSlotDescriptor();
	const passiveDescriptor = createPassiveDescriptor();
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
			actions: [],
			phaseComplete: false,
		}),
	});
	for (const [actionId, costs] of metadata.costMap.entries()) {
		session.setActionCosts(actionId, costs);
	}
	for (const [actionId, failures] of metadata.requirementFailures.entries()) {
		session.setActionRequirements(actionId, failures);
	}
	sessionState.metadata = createEmptySnapshotMetadata({
		resources: resourceDescriptors,
		populations: populationDescriptors,
		stats: Object.fromEntries(statMetadataEntries),
		assets: {
			land: landDescriptor,
			slot: slotDescriptor,
			passive: passiveDescriptor,
		},
		overviewContent: {
			hero: { title: 'Session Overview', tokens: {} },
			sections: [],
			tokens: {},
		},
	});
	initializeSessionState({
		sessionId,
		snapshot: sessionState,
		registries: toRegistriesPayload(sessionRegistries),
	});
	return {
		sessionId,
		session,
		sessionSnapshot: sessionState,
		cachedSessionSnapshot: sessionState,
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
	};
}
