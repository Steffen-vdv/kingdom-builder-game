import type { ZodType } from 'zod';
import {
	Resource,
	Phase,
	PopulationRole,
	Stat,
	ResourceV2Parent,
	GameState,
	setResourceKeys,
	setStatKeys,
	setPhaseKeys,
	setPopulationRoleKeys,
	initializePlayerResourceV2State,
	setResourceV2ParentKeys,
} from '../state';
import type {
	ResourceKey,
	StatKey,
	PopulationRoleId,
	ResourceV2ParentId,
	StatSourceMeta,
	StatSourceContribution,
	StatSourceLink,
} from '../state';
import { Services, PassiveManager } from '../services';
import { ResourceV2Service } from '../resourceV2/service';
import { ResourceV2TierService } from '../resourceV2/tier_service';
import {
	loadResourceV2Registry,
	type ResourceV2EngineRegistry,
} from '../resourceV2/registry';
import type { RuleSet } from '../services';
import { EngineContext } from '../context';
import { registerCoreEffects } from '../effects';
import { registerCoreEvaluators } from '../evaluators';
import { registerCoreRequirements } from '../requirements';
import { Registry } from '@kingdom-builder/protocol';
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
	type ResourceV2Definition,
	type ResourceV2GroupDefinition,
} from '@kingdom-builder/protocol';
import {
	applyPlayerStartConfiguration,
	diffPlayerStartConfiguration,
	determineCommonActionCostResource,
	initializePlayerActions,
} from './player_setup';
import { resolveStartConfigForMode } from './start_config_resolver';
import { RESOURCE_V2_STARTUP_METADATA } from '@kingdom-builder/contents/registries/resourceV2';

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
	resourceV2Registry?: ResourceV2EngineRegistry;
}

type ValidatedConfig = ReturnType<typeof validateGameConfig>;

type EngineRegistries = {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
};

type ResourceV2ConfigOverrides = {
	resourceDefinitions?: ReadonlyArray<ResourceV2Definition>;
	resourceGroups?: ReadonlyArray<ResourceV2GroupDefinition>;
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
	resourceV2Registry: resourceV2RegistryOverride,
}: EngineCreationOptions) {
	registerCoreEffects();
	registerCoreEvaluators();
	registerCoreRequirements();
	const defaultResourceV2Definitions =
		RESOURCE_V2_STARTUP_METADATA.definitions.definitions;
	const defaultResourceV2Groups = RESOURCE_V2_STARTUP_METADATA.groups.groups;
	let resourceDefinitionOverrides:
		| ReadonlyArray<ResourceV2Definition>
		| undefined;
	let resourceGroupOverrides:
		| ReadonlyArray<ResourceV2GroupDefinition>
		| undefined;
	let startConfig = start;
	if (config) {
		const configOverrides = config as unknown as ResourceV2ConfigOverrides;
		if (configOverrides.resourceDefinitions) {
			resourceDefinitionOverrides = configOverrides.resourceDefinitions;
		}
		if (configOverrides.resourceGroups) {
			resourceGroupOverrides = configOverrides.resourceGroups;
		}
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
		const resourceOverrides = validatedConfig as ValidatedConfig &
			ResourceV2ConfigOverrides;
		if (!resourceDefinitionOverrides && resourceOverrides.resourceDefinitions) {
			resourceDefinitionOverrides = resourceOverrides.resourceDefinitions;
		}
		if (!resourceGroupOverrides && resourceOverrides.resourceGroups) {
			resourceGroupOverrides = resourceOverrides.resourceGroups;
		}
	}
	const resourceV2Definitions =
		resourceDefinitionOverrides ?? defaultResourceV2Definitions;
	const resourceV2Groups = resourceGroupOverrides ?? defaultResourceV2Groups;
	validatePhases(phases);
	const activeResourceV2Registry =
		resourceV2RegistryOverride ??
		loadResourceV2Registry({
			resources: resourceV2Definitions,
			groups: resourceV2Groups,
		});
	startConfig = resolveStartConfigForMode(startConfig, devMode);
	setResourceKeys(Object.keys(startConfig.player.resources || {}));
	setStatKeys(Object.keys(startConfig.player.stats || {}));
	setPhaseKeys(phases.map((phaseDefinition) => phaseDefinition.id));
	setPopulationRoleKeys(Object.keys(startConfig.player.population || {}));
	setResourceV2ParentKeys([...activeResourceV2Registry.parentIds]);
	const services = new Services(rules, developments);
	const resourceV2TierService = new ResourceV2TierService();
	services.setResourceV2TierService(resourceV2TierService);
	const resourceV2Service = new ResourceV2Service(
		activeResourceV2Registry,
		resourceV2TierService,
	);
	const passiveManager = new PassiveManager();
	const gameState = new GameState('Player', 'Opponent');
	const actionCostResource = determineCommonActionCostResource(
		actions,
		activeResourceV2Registry,
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
		resourceV2Service,
		actions,
		buildings,
		developments,
		populations,
		passiveManager,
		phases,
		actionCostResource,
		compensationMap,
	);
	const playerOne = engineContext.game.players[0]!;
	const playerTwo = engineContext.game.players[1]!;
	const aiSystem = createAISystem({ performAction, advance });
	aiSystem.register(playerTwo.id, createTaxCollectorController(playerTwo.id));
	engineContext.aiSystem = aiSystem;
	initializePlayerResourceV2State(playerOne, activeResourceV2Registry);
	initializePlayerResourceV2State(playerTwo, activeResourceV2Registry);
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
	services.initializeResourceV2TierPassives(engineContext);
	return engineContext;
}

export { Resource, Phase, PopulationRole, Stat, ResourceV2Parent };
export type {
	RuleSet,
	ResourceKey,
	StatKey,
	PopulationRoleId,
	ResourceV2ParentId,
	StatSourceMeta,
	StatSourceContribution,
	StatSourceLink,
};
