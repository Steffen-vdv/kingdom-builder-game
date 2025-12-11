import {
	createActionCategoryRegistry,
	createActionRegistry,
	createBuildingRegistry,
	createDevelopmentRegistry,
	type ActionCategoryConfig as ContentActionCategoryConfig,
} from '@kingdom-builder/contents';
import type {
	ActionCategoryConfig as SessionActionCategoryConfig,
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	Registry,
} from '@kingdom-builder/protocol';

let seq = 0;
function nextId(prefix: string) {
	seq += 1;
	return `${prefix}_${seq}`;
}

export interface ContentFactory {
	categories: Registry<ContentActionCategoryConfig>;
	actions: Registry<ActionConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	category(
		definition?: Partial<ContentActionCategoryConfig>,
	): ContentActionCategoryConfig;
	action(definition?: Partial<ActionConfig>): ActionConfig;
	building(definition?: Partial<BuildingConfig>): BuildingConfig;
	development(definition?: Partial<DevelopmentConfig>): DevelopmentConfig;
}

export function createContentFactory(): ContentFactory {
	const categories = createActionCategoryRegistry();
	const actions = createActionRegistry();
	const buildings = createBuildingRegistry();
	const developments = createDevelopmentRegistry();

	let nextCategoryOrder = categories.values().length;

	function category(
		definition: Partial<ContentActionCategoryConfig> = {},
	): ContentActionCategoryConfig {
		const id = definition.id ?? nextId('category');
		const order =
			typeof definition.order === 'number'
				? definition.order
				: nextCategoryOrder++;

		const built: ContentActionCategoryConfig = {
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
			onPayUpkeepStep: definition.onPayUpkeepStep ?? [],
			onGainIncomeStep: definition.onGainIncomeStep ?? [],
			onGainAPStep: definition.onGainAPStep ?? [],
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
			onPayUpkeepStep: definition.onPayUpkeepStep ?? [],
			onGainIncomeStep: definition.onGainIncomeStep ?? [],
			onGainAPStep: definition.onGainAPStep ?? [],
			onBeforeAttacked: definition.onBeforeAttacked ?? [],
			onAttackResolved: definition.onAttackResolved ?? [],
			system: definition.system,
			populationCap: definition.populationCap,
			upkeep: definition.upkeep,
		};
		developments.add(id, built);
		return built;
	}

	return {
		categories,
		actions,
		buildings,
		developments,
		category,
		action,
		building,
		development,
	};
}

export function toSessionActionCategoryConfig(
	definition: ContentActionCategoryConfig,
): SessionActionCategoryConfig {
	return {
		id: definition.id,
		title: definition.label,
		subtitle: definition.subtitle ?? definition.label,
		icon: definition.icon,
		order: definition.order,
		layout: definition.layout,
		hideWhenEmpty: definition.hideWhenEmpty,
		description: definition.description,
		analyticsKey: definition.analyticsKey,
	} satisfies SessionActionCategoryConfig;
}
