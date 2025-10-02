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
} from '../../src/config/schema';
import type { Registry } from '../../src/registry';

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
	action(def?: Partial<ActionConfig>): ActionConfig;
	building(def?: Partial<BuildingConfig>): BuildingConfig;
	development(def?: Partial<DevelopmentConfig>): DevelopmentConfig;
	population(def?: Partial<PopulationConfig>): PopulationConfig;
}

export function createContentFactory(): ContentFactory {
	const actions = createActionRegistry();
	const buildings = createBuildingRegistry();
	const developments = createDevelopmentRegistry();
	const populations = createPopulationRegistry();

	function action(def: Partial<ActionConfig> = {}): ActionConfig {
		const id = def.id ?? nextId('action');
		const built: ActionConfig = {
			id,
			name: def.name ?? id,
			icon: def.icon,
			baseCosts: def.baseCosts ?? {},
			requirements: def.requirements ?? [],
			effects: def.effects ?? [],
			system: def.system,
		};
		actions.add(id, built);
		return built;
	}

	function building(def: Partial<BuildingConfig> = {}): BuildingConfig {
		const id = def.id ?? nextId('building');
		const built: BuildingConfig = {
			id,
			name: def.name ?? id,
			icon: def.icon,
			costs: def.costs ?? {},
			onBuild: def.onBuild ?? [],
			onGrowthPhase: def.onGrowthPhase ?? [],
			onUpkeepPhase: def.onUpkeepPhase ?? [],
			onBeforeAttacked: def.onBeforeAttacked ?? [],
			onAttackResolved: def.onAttackResolved ?? [],
		};
		buildings.add(id, built);
		return built;
	}

	function development(
		def: Partial<DevelopmentConfig> = {},
	): DevelopmentConfig {
		const id = def.id ?? nextId('development');
		const built: DevelopmentConfig = {
			id,
			name: def.name ?? id,
			icon: def.icon,
			onBuild: def.onBuild ?? [],
			onGrowthPhase: def.onGrowthPhase ?? [],
			onBeforeAttacked: def.onBeforeAttacked ?? [],
			onAttackResolved: def.onAttackResolved ?? [],
			onPayUpkeepStep: def.onPayUpkeepStep ?? [],
			onGainIncomeStep: def.onGainIncomeStep ?? [],
			onGainAPStep: def.onGainAPStep ?? [],
			system: def.system,
			populationCap: def.populationCap,
			upkeep: def.upkeep,
		};
		developments.add(id, built);
		return built;
	}

	function population(def: Partial<PopulationConfig> = {}): PopulationConfig {
		const id = def.id ?? nextId('population');
		const built: PopulationConfig = {
			id,
			name: def.name ?? id,
			icon: def.icon,
			onAssigned: def.onAssigned ?? [],
			onUnassigned: def.onUnassigned ?? [],
			onGrowthPhase: def.onGrowthPhase ?? [],
			onUpkeepPhase: def.onUpkeepPhase ?? [],
			onPayUpkeepStep: def.onPayUpkeepStep ?? [],
			onGainIncomeStep: def.onGainIncomeStep ?? [],
			onGainAPStep: def.onGainAPStep ?? [],
			upkeep: def.upkeep,
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
