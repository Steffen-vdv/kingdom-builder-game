import type { ZodType } from 'zod';
import { GameState } from '../state';
import type { ResourceKey, PopulationRoleId } from '../state';
import { Services, PassiveManager } from '../services';
import type { RuleSet } from '../services';
import { EngineContext } from '../context';
import { registerCoreEffects } from '../effects';
import { registerCoreEvaluators } from '../evaluators';
import { registerCoreRequirements } from '../requirements';
import { createAISystem, createTaxCollectorController } from '../ai';
import { performAction, simulateAction } from '../actions/action_execution';
import { advance } from '../phases/advance';
import {
	validateGameConfig,
	type GameConfig,
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	type PlayerStartConfig,
	type ActionConfig as ActionDef,
	type BuildingConfig as BuildingDef,
	type DevelopmentConfig as DevelopmentDef,
	type PopulationConfig as PopulationDef,
	type StartConfig,
	type PhaseConfig,
	Registry,
	type ResourceV2CatalogSnapshot,
} from '@kingdom-builder/protocol';
import {
	createRuntimeResourceCatalog,
	type RuntimeResourceCatalog,
} from '../resource-v2';
import {
	applyPlayerStartConfiguration,
	diffPlayerStartConfiguration,
	determineCommonActionCostResource,
	initializePlayerActions,
} from './player_setup';
import { resolveStartConfigForMode } from './start_config_resolver';

export interface EngineCreationOptions {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	config?: GameConfig;
	devMode?: boolean;
	resourceCatalogV2?: RuntimeResourceContent;
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

export function createEngine({
	actions,
	buildings,
	developments,
	populations,
	phases,
	start,
	rules,
	config,
	devMode = false,
	resourceCatalogV2,
}: EngineCreationOptions) {
	registerCoreEffects();
	registerCoreEvaluators();
	registerCoreRequirements();
	let startConfig = start;
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
		if (validatedConfig.start) {
			startConfig = validatedConfig.start;
		}
		if (validatedConfig.resourceCatalogV2) {
			runtimeResourceContent = convertResourceCatalogSnapshot(
				validatedConfig.resourceCatalogV2,
			);
		}
	}
	if (!runtimeResourceContent) {
		throw new Error(
			'createEngine requires resourceCatalogV2 content when no GameConfig override is provided.',
		);
	}
	runtimeResourceCatalog = createRuntimeResourceCatalog(runtimeResourceContent);
	validatePhases(phases);
	startConfig = resolveStartConfigForMode(startConfig, devMode);
	const services = new Services(rules, developments);
	const passiveManager = new PassiveManager();
	const gameState = new GameState(runtimeResourceCatalog, 'Player', 'Opponent');
	const actionCostConfig = determineCommonActionCostResource(
		actions,
		runtimeResourceCatalog,
	);
	const playerACompensation = diffPlayerStartConfiguration(
		startConfig.player,
		startConfig.players?.['A'],
	);
	const playerBCompensation = diffPlayerStartConfiguration(
		startConfig.player,
		startConfig.players?.['B'],
	);
	const compensationMap = {
		A: playerACompensation,
		B: playerBCompensation,
	} as Record<'A' | 'B', PlayerStartConfig>;
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
		compensationMap,
	);
	const playerOne = engineContext.game.players[0]!;
	const playerTwo = engineContext.game.players[1]!;
	// AI actions use simulation before execution to prevent partial state
	// changes when an action fails. This mirrors the session's performAction
	// behavior: simulate first, then execute only if simulation succeeds.
	const aiPerformAction: typeof performAction = (actionId, ctx, params) => {
		simulateAction(actionId, ctx, params);
		return performAction(actionId, ctx, params);
	};
	const aiSystem = createAISystem({ performAction: aiPerformAction, advance });
	aiSystem.register(playerTwo.id, createTaxCollectorController(playerTwo.id));
	engineContext.aiSystem = aiSystem;
	applyPlayerStartConfiguration(
		playerOne,
		startConfig.player,
		rules,
		runtimeResourceCatalog,
	);
	applyPlayerStartConfiguration(
		playerOne,
		playerACompensation,
		rules,
		runtimeResourceCatalog,
	);
	applyPlayerStartConfiguration(
		playerTwo,
		startConfig.player,
		rules,
		runtimeResourceCatalog,
	);
	applyPlayerStartConfiguration(
		playerTwo,
		playerBCompensation,
		rules,
		runtimeResourceCatalog,
	);
	initializePlayerActions(playerOne, actions);
	initializePlayerActions(playerTwo, actions);
	engineContext.game.currentPlayerIndex = 0;
	engineContext.game.currentPhase = phases[0]?.id || '';
	engineContext.game.currentStep = phases[0]?.steps[0]?.id || '';
	engineContext.game.devMode = devMode;
	services.initializeTierPassives(engineContext);
	return engineContext;
}

export type { RuleSet, ResourceKey, PopulationRoleId };
