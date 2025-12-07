import type { ZodType } from 'zod';
import { GameState } from '../state';
import type { ResourceKey, PopulationRoleId } from '../state';
import { Services, PassiveManager } from '../services';
import type { RuleSet } from '../services';
import { EngineContext } from '../context';
import { registerCoreEffects, runEffects } from '../effects';
import { registerCoreEvaluators } from '../evaluators';
import { registerCoreRequirements } from '../requirements';
import { createAISystem, createTaxCollectorController } from '../ai';
import { performAction } from '../actions/action_execution';
import { advance } from '../phases/advance';
import {
	validateGameConfig,
	type GameConfig,
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	resolveActionEffects,
	type ActionConfig as ActionDef,
	type BuildingConfig as BuildingDef,
	type DevelopmentConfig as DevelopmentDef,
	type PopulationConfig as PopulationDef,
	type PhaseConfig,
	Registry,
	type ResourceV2CatalogSnapshot,
} from '@kingdom-builder/protocol';
import {
	createRuntimeResourceCatalog,
	type RuntimeResourceCatalog,
} from '../resource-v2';
import {
	determineCommonActionCostResource,
	initializePlayerActions,
} from './player_setup';

export interface EngineCreationOptions {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
	phases: PhaseConfig[];
	rules: RuleSet;
	config?: GameConfig;
	devMode?: boolean;
	resourceCatalogV2?: RuntimeResourceContent;
	/**
	 * System action IDs for initial setup. The engine will run these actions
	 * to set up players at game start.
	 */
	systemActionIds?: {
		initialSetup: string;
		initialSetupDevmode: string;
		compensation: string;
		compensationDevmodeB: string;
	};
}

type ValidatedConfig = ReturnType<typeof validateGameConfig>;

type EngineRegistries = {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
};

type RuntimeResourceContent = Parameters<
	typeof createRuntimeResourceCatalog
>[0];

function validatePhases(
	phases: PhaseConfig[] | undefined,
): asserts phases is PhaseConfig[] {
	if (!phases || phases.length === 0) {
		const message =
			'Cannot create engine: expected at least one phase with ' +
			'steps, but received none.';
		throw new Error(message);
	}
	for (const phase of phases) {
		if (!phase) {
			throw new Error(
				'Cannot create engine: phases array contains an undefined entry.',
			);
		}
		const phaseId = phase.id ?? '<unknown phase>';
		if (!phase.steps || phase.steps.length === 0) {
			const message =
				'Cannot create engine: phase "' +
				phaseId +
				'" must define at least one step.';
			throw new Error(message);
		}
		for (const step of phase.steps) {
			if (!step) {
				const message =
					'Cannot create engine: phase "' +
					phaseId +
					'" includes an undefined step.';
				throw new Error(message);
			}
			if (!step.id || step.id.trim().length === 0) {
				const message =
					'Cannot create engine: phase "' +
					phaseId +
					'" includes a step without an id.';
				throw new Error(message);
			}
		}
	}
}

function buildRegistry<DefinitionType extends { id: string }>(
	definitions: DefinitionType[] | undefined,
	schema: ZodType<DefinitionType>,
): Registry<DefinitionType> | undefined {
	if (!definitions || definitions.length === 0) {
		return undefined;
	}
	const registry = new Registry<DefinitionType>(schema);
	for (const definition of definitions) {
		registry.add(definition.id, definition);
	}
	return registry;
}

function overrideRegistries(
	validatedConfig: ValidatedConfig,
	currentRegistries: EngineRegistries,
): EngineRegistries {
	const nextRegistries = { ...currentRegistries };
	const actionRegistry = buildRegistry(validatedConfig.actions, actionSchema);
	if (actionRegistry) {
		nextRegistries.actions = actionRegistry;
	}
	const buildingRegistry = buildRegistry(
		validatedConfig.buildings,
		buildingSchema,
	);
	if (buildingRegistry) {
		nextRegistries.buildings = buildingRegistry;
	}
	const developmentRegistry = buildRegistry(
		validatedConfig.developments,
		developmentSchema,
	);
	if (developmentRegistry) {
		nextRegistries.developments = developmentRegistry;
	}
	const populationRegistry = buildRegistry(
		validatedConfig.populations,
		populationSchema,
	);
	if (populationRegistry) {
		nextRegistries.populations = populationRegistry;
	}
	return nextRegistries;
}

function convertResourceCatalogSnapshot(
	snapshot: ResourceV2CatalogSnapshot,
): RuntimeResourceContent {
	return {
		resources: {
			ordered: snapshot.resources.ordered,
			byId: snapshot.resources.byId,
		},
		groups: {
			ordered: snapshot.groups.ordered,
			byId: snapshot.groups.byId,
		},
		categories: {
			ordered: snapshot.categories?.ordered ?? [],
			byId: snapshot.categories?.byId ?? {},
		},
	} as RuntimeResourceContent;
}

/**
 * Runs a system action's effects directly, bypassing cost/requirement checks.
 * Used for initial setup actions that run before the game starts.
 * Returns false if the action doesn't exist (allows skipping setup in tests).
 */
function runSystemActionEffects(
	actionId: string,
	engineContext: EngineContext,
): boolean {
	if (!engineContext.actions.has(actionId)) {
		return false;
	}
	const actionDefinition = engineContext.actions.get(actionId);
	const resolved = resolveActionEffects(actionDefinition, undefined);
	runEffects(resolved.effects, engineContext);
	return true;
}

// Default system action IDs from @kingdom-builder/contents
const DEFAULT_SYSTEM_ACTION_IDS = {
	initialSetup: 'initial_setup',
	initialSetupDevmode: 'initial_setup_devmode',
	compensation: 'compensation',
	compensationDevmodeB: 'compensation_devmode_b',
};

export function createEngine({
	actions,
	buildings,
	developments,
	populations,
	phases,
	rules,
	config,
	devMode = false,
	resourceCatalogV2,
	systemActionIds = DEFAULT_SYSTEM_ACTION_IDS,
}: EngineCreationOptions) {
	registerCoreEffects();
	registerCoreEvaluators();
	registerCoreRequirements();
	let runtimeResourceContent: RuntimeResourceContent | undefined =
		resourceCatalogV2;
	let runtimeResourceCatalog: RuntimeResourceCatalog | undefined;
	if (config) {
		const validatedConfig = validateGameConfig(config);
		({ actions, buildings, developments, populations } = overrideRegistries(
			validatedConfig,
			{
				actions,
				buildings,
				developments,
				populations,
			},
		));
		if (validatedConfig.resourceCatalogV2) {
			runtimeResourceContent = convertResourceCatalogSnapshot(
				validatedConfig.resourceCatalogV2,
			);
		}
	}
	if (!runtimeResourceContent) {
		throw new Error(
			'createEngine requires resourceCatalogV2 content when no ' +
				'GameConfig override is provided.',
		);
	}
	runtimeResourceCatalog = createRuntimeResourceCatalog(runtimeResourceContent);
	validatePhases(phases);
	const services = new Services(rules, developments);
	const passiveManager = new PassiveManager();
	const gameState = new GameState(runtimeResourceCatalog, 'Player', 'Opponent');
	const actionCostConfig = determineCommonActionCostResource(
		actions,
		runtimeResourceCatalog,
	);
	const engineContext = new EngineContext(
		gameState,
		services,
		actions,
		buildings,
		developments,
		populations,
		passiveManager,
		phases,
		actionCostConfig.resourceId,
		actionCostConfig.amount,
		runtimeResourceCatalog,
	);
	const playerOne = engineContext.game.players[0]!;
	const playerTwo = engineContext.game.players[1]!;
	const aiSystem = createAISystem({ performAction, advance });
	aiSystem.register(playerTwo.id, createTaxCollectorController(playerTwo.id));
	engineContext.aiSystem = aiSystem;

	// Select the appropriate initial setup action based on mode
	const setupActionId = devMode
		? systemActionIds.initialSetupDevmode
		: systemActionIds.initialSetup;

	// Run initial setup for player 1
	engineContext.game.currentPlayerIndex = 0;
	runSystemActionEffects(setupActionId, engineContext);

	// Run initial setup for player 2
	engineContext.game.currentPlayerIndex = 1;
	runSystemActionEffects(setupActionId, engineContext);

	// Run compensation for player 2 (last player gets extra resources)
	runSystemActionEffects(systemActionIds.compensation, engineContext);

	// In dev mode, also run the devmode-specific compensation for player B
	if (devMode) {
		runSystemActionEffects(systemActionIds.compensationDevmodeB, engineContext);
	}

	// Initialize player actions (unlocks non-system actions for players)
	initializePlayerActions(playerOne, actions);
	initializePlayerActions(playerTwo, actions);

	// Set initial game state
	engineContext.game.currentPlayerIndex = 0;
	engineContext.game.currentPhase = phases[0]?.id || '';
	engineContext.game.currentStep = phases[0]?.steps[0]?.id || '';
	engineContext.game.devMode = devMode;

	// Initialize tier-based passives (e.g., happiness tiers)
	services.initializeTierPassives(engineContext);

	return engineContext;
}

export type { RuleSet, ResourceKey, PopulationRoleId };
