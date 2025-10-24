import type { ZodType } from 'zod';
import {
	Resource,
	Phase,
	PopulationRole,
	Stat,
	GameState,
	setResourceKeys,
	setStatKeys,
	setPhaseKeys,
	setPopulationRoleKeys,
} from '../state';
import type {
	ResourceKey,
	StatKey,
	PopulationRoleId,
	StatSourceMeta,
	StatSourceContribution,
	StatSourceLink,
} from '../state';
import { Services, PassiveManager } from '../services';
import type { RuleSet } from '../services';
import { EngineContext } from '../context';
import { registerCoreEffects } from '../effects';
import { registerCoreEvaluators } from '../evaluators';
import { registerCoreRequirements } from '../requirements';
import { Registry } from '@kingdom-builder/protocol';
import {
	RESOURCE_GROUP_V2_REGISTRY,
	RESOURCE_V2_REGISTRY,
} from '@kingdom-builder/contents/registries/resourceV2';
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
	type PlayerStartConfig,
	type ActionConfig as ActionDef,
	type BuildingConfig as BuildingDef,
	type DevelopmentConfig as DevelopmentDef,
	type PopulationConfig as PopulationDef,
	type StartConfig,
	type PhaseConfig,
} from '@kingdom-builder/protocol';
import {
	applyPlayerStartConfiguration,
	diffPlayerStartConfiguration,
	determineCommonActionCostResource,
	initializePlayerActions,
} from './player_setup';
import { resolveStartConfigForMode } from './start_config_resolver';
import { createRuntimeResourceCatalog } from '../resource-v2';

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
}

type ValidatedConfig = ReturnType<typeof validateGameConfig>;

type EngineRegistries = {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
};

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
}: EngineCreationOptions) {
	registerCoreEffects();
	registerCoreEvaluators();
	registerCoreRequirements();
	type RuntimeCatalogInput = Parameters<typeof createRuntimeResourceCatalog>[0];
	let resourceCatalogInput: RuntimeCatalogInput = {
		resources: RESOURCE_V2_REGISTRY as RuntimeCatalogInput['resources'],
		groups: RESOURCE_GROUP_V2_REGISTRY as RuntimeCatalogInput['groups'],
	};
	let startConfig = start;
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
			resourceCatalogInput = {
				resources: validatedConfig.resourceCatalogV2
					.resources as RuntimeCatalogInput['resources'],
				groups: validatedConfig.resourceCatalogV2
					.groups as RuntimeCatalogInput['groups'],
			};
		}
	}
	validatePhases(phases);
	startConfig = resolveStartConfigForMode(startConfig, devMode);
	setResourceKeys(Object.keys(startConfig.player.resources || {}));
	setStatKeys(Object.keys(startConfig.player.stats || {}));
	setPhaseKeys(phases.map((phaseDefinition) => phaseDefinition.id));
	setPopulationRoleKeys(Object.keys(startConfig.player.population || {}));
	const resourceCatalogV2 = createRuntimeResourceCatalog(resourceCatalogInput);
	const services = new Services(rules, developments);
	const passiveManager = new PassiveManager();
	const gameState = new GameState('Player', 'Opponent');
	gameState.resourceCatalogV2 = resourceCatalogV2;
	const actionCostResource = determineCommonActionCostResource(actions);
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
		actionCostResource,
		compensationMap,
	);
	engineContext.resourceCatalogV2 = resourceCatalogV2;
	const playerOne = engineContext.game.players[0]!;
	const playerTwo = engineContext.game.players[1]!;
	const aiSystem = createAISystem({ performAction, advance });
	aiSystem.register(playerTwo.id, createTaxCollectorController(playerTwo.id));
	engineContext.aiSystem = aiSystem;
	applyPlayerStartConfiguration(playerOne, startConfig.player, rules);
	applyPlayerStartConfiguration(playerOne, playerACompensation, rules);
	applyPlayerStartConfiguration(playerTwo, startConfig.player, rules);
	applyPlayerStartConfiguration(playerTwo, playerBCompensation, rules);
	initializePlayerActions(playerOne, actions);
	initializePlayerActions(playerTwo, actions);
	engineContext.game.currentPlayerIndex = 0;
	engineContext.game.currentPhase = phases[0]?.id || '';
	engineContext.game.currentStep = phases[0]?.steps[0]?.id || '';
	engineContext.game.devMode = devMode;
	services.initializeTierPassives(engineContext);
	return engineContext;
}

export { Resource, Phase, PopulationRole, Stat };
export type {
	RuleSet,
	ResourceKey,
	StatKey,
	PopulationRoleId,
	StatSourceMeta,
	StatSourceContribution,
	StatSourceLink,
};
