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
import { Registry } from '../registry';
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
} from '../config/schema';
import type { PhaseDef } from '../phases';
import {
	applyPlayerStartConfiguration,
	diffPlayerStartConfiguration,
	determineCommonActionCostResource,
} from './player_setup';

export interface EngineCreationOptions {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
	phases: PhaseDef[];
	start: StartConfig;
	rules: RuleSet;
	config?: GameConfig;
}

type ValidatedConfig = ReturnType<typeof validateGameConfig>;

type EngineRegistries = {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
};

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
}: EngineCreationOptions) {
	registerCoreEffects();
	registerCoreEvaluators();
	registerCoreRequirements();
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
	}
	setResourceKeys(Object.keys(startConfig.player.resources || {}));
	setStatKeys(Object.keys(startConfig.player.stats || {}));
	setPhaseKeys(phases.map((phaseDefinition) => phaseDefinition.id));
	setPopulationRoleKeys(Object.keys(startConfig.player.population || {}));
	const services = new Services(rules, developments);
	const passiveManager = new PassiveManager();
	const gameState = new GameState('Player', 'Opponent');
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
	const playerOne = engineContext.game.players[0]!;
	const playerTwo = engineContext.game.players[1]!;
	const aiSystem = createAISystem({ performAction, advance });
	aiSystem.register(playerTwo.id, createTaxCollectorController(playerTwo.id));
	engineContext.aiSystem = aiSystem;
	applyPlayerStartConfiguration(playerOne, startConfig.player, rules);
	applyPlayerStartConfiguration(playerOne, playerACompensation, rules);
	applyPlayerStartConfiguration(playerTwo, startConfig.player, rules);
	applyPlayerStartConfiguration(playerTwo, playerBCompensation, rules);
	engineContext.game.currentPlayerIndex = 0;
	engineContext.game.currentPhase = phases[0]?.id || '';
	engineContext.game.currentStep = phases[0]?.steps[0]?.id || '';
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
