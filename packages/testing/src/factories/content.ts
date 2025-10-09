import {
	createActionRegistry,
	createBuildingRegistry,
	createDevelopmentRegistry,
	createPopulationRegistry,
} from '@kingdom-builder/contents';
import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	Registry,
} from '@kingdom-builder/protocol';

let seq = 0;
function nextId(prefix: string) {
	seq += 1;
	return `${prefix}_${seq}`;
}

export interface ContentFactory {
	actions: Registry<ActionConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	action(definition?: Partial<ActionConfig>): ActionConfig;
	building(definition?: Partial<BuildingConfig>): BuildingConfig;
	development(definition?: Partial<DevelopmentConfig>): DevelopmentConfig;
	population(definition?: Partial<PopulationConfig>): PopulationConfig;
}

export function createContentFactory(): ContentFactory {
	const actions = createActionRegistry();
	const buildings = createBuildingRegistry();
	const developments = createDevelopmentRegistry();
	const populations = createPopulationRegistry();

	function action(definition: Partial<ActionConfig> = {}): ActionConfig {
		const id = definition.id ?? nextId('action');
		const built: ActionConfig = {
			id,
			name: definition.name ?? id,
			icon: definition.icon,
			baseCosts: definition.baseCosts ?? {},
			requirements: definition.requirements ?? [],
			effects: definition.effects ?? [],
			system: definition.system,
		};
		actions.add(id, built);
		return built;
	}

	function building(definition: Partial<BuildingConfig> = {}): BuildingConfig {
		const id = definition.id ?? nextId('building');
		const built: BuildingConfig = {
			id,
			name: definition.name ?? id,
			icon: definition.icon,
			costs: definition.costs ?? {},
			onBuild: definition.onBuild ?? [],
			onGrowthPhase: definition.onGrowthPhase ?? [],
			onUpkeepPhase: definition.onUpkeepPhase ?? [],
			onBeforeAttacked: definition.onBeforeAttacked ?? [],
			onAttackResolved: definition.onAttackResolved ?? [],
		};
		buildings.add(id, built);
		return built;
	}

	function development(
		definition: Partial<DevelopmentConfig> = {},
	): DevelopmentConfig {
		const id = definition.id ?? nextId('development');
		const built: DevelopmentConfig = {
			id,
			name: definition.name ?? id,
			icon: definition.icon,
			onBuild: definition.onBuild ?? [],
			onGrowthPhase: definition.onGrowthPhase ?? [],
			onBeforeAttacked: definition.onBeforeAttacked ?? [],
			onAttackResolved: definition.onAttackResolved ?? [],
			onPayUpkeepStep: definition.onPayUpkeepStep ?? [],
			onGainIncomeStep: definition.onGainIncomeStep ?? [],
			onGainAPStep: definition.onGainAPStep ?? [],
			system: definition.system,
			populationCap: definition.populationCap,
			upkeep: definition.upkeep,
		};
		developments.add(id, built);
		return built;
	}

	function population(
		definition: Partial<PopulationConfig> = {},
	): PopulationConfig {
		const id = definition.id ?? nextId('population');
		const built: PopulationConfig = {
			id,
			name: definition.name ?? id,
			icon: definition.icon,
			onAssigned: definition.onAssigned ?? [],
			onUnassigned: definition.onUnassigned ?? [],
			onGrowthPhase: definition.onGrowthPhase ?? [],
			onUpkeepPhase: definition.onUpkeepPhase ?? [],
			onPayUpkeepStep: definition.onPayUpkeepStep ?? [],
			onGainIncomeStep: definition.onGainIncomeStep ?? [],
			onGainAPStep: definition.onGainAPStep ?? [],
			upkeep: definition.upkeep,
		};
		populations.add(id, built);
		return built;
	}

	return {
		actions,
		buildings,
		developments,
		populations,
		action,
		building,
		development,
		population,
	};
}
