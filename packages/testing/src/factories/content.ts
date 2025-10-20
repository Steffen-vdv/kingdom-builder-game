import {
	createActionCategoryRegistry,
	createActionRegistry,
	createBuildingRegistry,
	createDevelopmentRegistry,
	createPopulationRegistry,
	type ActionCategoryConfig,
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
	categories: Registry<ActionCategoryConfig>;
	actions: Registry<ActionConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	category(definition?: Partial<ActionCategoryConfig>): ActionCategoryConfig;
	action(definition?: Partial<ActionConfig>): ActionConfig;
	building(definition?: Partial<BuildingConfig>): BuildingConfig;
	development(definition?: Partial<DevelopmentConfig>): DevelopmentConfig;
	population(definition?: Partial<PopulationConfig>): PopulationConfig;
}

export function createContentFactory(): ContentFactory {
	const categories = createActionCategoryRegistry();
	const actions = createActionRegistry();
	const buildings = createBuildingRegistry();
	const developments = createDevelopmentRegistry();
	const populations = createPopulationRegistry();

	let nextCategoryOrder = categories.values().length;

	function category(
		definition: Partial<ActionCategoryConfig> = {},
	): ActionCategoryConfig {
		const id = definition.id ?? nextId('category');
		const order =
			typeof definition.order === 'number'
				? definition.order
				: nextCategoryOrder++;

		const built: ActionCategoryConfig = {
			id,
			label: definition.label ?? id,
			subtitle: definition.subtitle ?? definition.label ?? id,
			icon: definition.icon ?? 'icon-action-generic',
			order,
			layout: definition.layout ?? 'grid-primary',
			hideWhenEmpty: definition.hideWhenEmpty ?? false,
			analyticsKey: definition.analyticsKey ?? id,
		};

		if (definition.description) {
			built.description = definition.description;
		}

		categories.add(id, built);

		return built;
	}

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
		categories,
		actions,
		buildings,
		developments,
		populations,
		category,
		action,
		building,
		development,
		population,
	};
}
