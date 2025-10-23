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
	type ResourceV2DefinitionConfig,
	type ResourceV2GroupDefinitionConfig,
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
import { prepareResourceV2Bootstrap } from './resource_v2_bootstrap';

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
	resourceDefinitions?: Iterable<ResourceV2DefinitionConfig>;
	resourceGroups?: Iterable<ResourceV2GroupDefinitionConfig>;
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

function toArray<T>(iterable: Iterable<T> | undefined): T[] {
	return iterable ? Array.from(iterable) : [];
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
	resourceDefinitions,
	resourceGroups,
}: EngineCreationOptions) {
	registerCoreEffects();
	registerCoreEvaluators();
	registerCoreRequirements();
	let startConfig = start;
	let resourceDefinitionSource = toArray(resourceDefinitions);
	let resourceGroupSource = toArray(resourceGroups);
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
		if (validatedConfig.resourcesV2?.definitions) {
			resourceDefinitionSource = [...validatedConfig.resourcesV2.definitions];
		}
		if (validatedConfig.resourcesV2?.groups) {
			resourceGroupSource = [...validatedConfig.resourcesV2.groups];
		}
		if (validatedConfig.start) {
			startConfig = validatedConfig.start;
		}
	}
	validatePhases(phases);
	startConfig = resolveStartConfigForMode(startConfig, devMode);
	setResourceKeys(Object.keys(startConfig.player.resources || {}));
	setStatKeys(Object.keys(startConfig.player.stats || {}));
	setPhaseKeys(phases.map((phaseDefinition) => phaseDefinition.id));
	setPopulationRoleKeys(Object.keys(startConfig.player.population || {}));
	const resourceBootstrap = prepareResourceV2Bootstrap({
		definitions: resourceDefinitionSource,
		groups: resourceGroupSource,
		startConfig,
	});
	const services = new Services(rules, developments);
	const passiveManager = new PassiveManager();
	const gameState = new GameState(
		'Player',
		'Opponent',
		resourceBootstrap.playerFactory,
	);
	const actionCostPointer = resourceBootstrap.globalActionCost;
	const actionCostResource =
		actionCostPointer?.resourceId ?? determineCommonActionCostResource(actions);
	const actionCostAmount =
		actionCostPointer?.amount ?? rules.defaultActionAPCost;
	const playerACompensation = diffPlayerStartConfiguration(
		startConfig.player,
		startConfig.players?.['A'],
	);
	const playerBCompensation = diffPlayerStartConfiguration(
		startConfig.player,
		startConfig.players?.['B'],
	);
	if (resourceBootstrap.hasResourceV2) {
		resourceBootstrap.validatePlayerStart(
			playerACompensation,
			'start.players["A"]',
		);
		resourceBootstrap.validatePlayerStart(
			playerBCompensation,
			'start.players["B"]',
		);
	}
	const compensationMap: Record<'A' | 'B', PlayerStartConfig> = {
		A: playerACompensation,
		B: playerBCompensation,
	};
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
		actionCostAmount,
	);
	const playerOne = engineContext.game.players[0]!;
	const playerTwo = engineContext.game.players[1]!;
	resourceBootstrap.attachRuntime(engineContext);
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
