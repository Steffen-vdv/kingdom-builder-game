import {
	createActionCategoryRegistry,
	createActionRegistry,
	createBuildingRegistry,
	createDevelopmentRegistry,
	createPopulationRegistry,
	createResourceV2GroupRegistry,
	createResourceV2Registry,
	resourceV2,
	resourceV2TierTrack,
	type ActionCategoryConfig as ContentActionCategoryConfig,
	type ResourceV2Builder,
	type ResourceV2Definition,
	type ResourceV2DefinitionRegistry,
	type ResourceV2GroupDefinition,
	type ResourceV2GroupRegistry,
	type ResourceV2TierTrack,
	type ResourceV2TierTrackBuilder,
} from '@kingdom-builder/contents';
import type {
	ActionCategoryConfig as SessionActionCategoryConfig,
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	Registry,
	ResourceV2DefinitionConfig,
	ResourceV2GroupDefinitionConfig,
	ResourceV2TierTrackConfig,
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
	populations: Registry<PopulationConfig>;
	resourceDefinitions: ResourceV2DefinitionRegistry;
	resourceGroups: ResourceV2GroupRegistry;
	category(
		definition?: Partial<ContentActionCategoryConfig>,
	): ContentActionCategoryConfig;
	action(definition?: Partial<ActionConfig>): ActionConfig;
	building(definition?: Partial<BuildingConfig>): BuildingConfig;
	development(definition?: Partial<DevelopmentConfig>): DevelopmentConfig;
	population(definition?: Partial<PopulationConfig>): PopulationConfig;
	resourceDefinition(
		definition?: ResourceDefinitionOptions,
	): ResourceV2Definition;
	resourceGroup(
		definition?: ResourceGroupDefinitionOptions,
	): ResourceV2GroupDefinition;
	resourceTierTrack(definition?: ResourceTierTrackOptions): ResourceV2TierTrack;
}

export interface ResourceDefinitionOptions {
	id?: string;
	icon?: string;
	label?: string;
	description?: string;
	order?: number;
	configure?: (builder: ResourceV2Builder) => void;
}

export interface ResourceGroupDefinitionOptions {
	id?: string;
	parentId?: string;
	parentIcon?: string;
	parentLabel?: string;
	parentDescription?: string;
	parentOrder?: number;
}

export interface ResourceTierTrackOptions {
	id?: string;
	steps?: ResourceV2TierTrack['steps'];
	display?: ResourceV2TierTrack['display'];
	configure?: (builder: ResourceV2TierTrackBuilder) => void;
}

export function createContentFactory(): ContentFactory {
	const categories = createActionCategoryRegistry();
	const actions = createActionRegistry();
	const buildings = createBuildingRegistry();
	const developments = createDevelopmentRegistry();
	const populations = createPopulationRegistry();
	const resourceDefinitions = createResourceV2Registry();
	const resourceGroups = createResourceV2GroupRegistry();

	let nextCategoryOrder = categories.values().length;
	let nextResourceOrder = resourceDefinitions.values().length;
	let nextGroupOrder = resourceGroups.values().length;

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

	function resourceDefinition(
		definition: ResourceDefinitionOptions = {},
	): ResourceV2Definition {
		const id = definition.id ?? nextId('resource');
		const builder = resourceV2(id)
			.icon(definition.icon ?? 'icon-resource-generic')
			.label(definition.label ?? id)
			.description(definition.description ?? definition.label ?? id);

		const order =
			typeof definition.order === 'number'
				? definition.order
				: nextResourceOrder++;
		builder.order(order);

		if (definition.configure) {
			definition.configure(builder);
		}

		const built = builder.build();
		resourceDefinitions.add(built);
		return built satisfies ResourceV2Definition & ResourceV2DefinitionConfig;
	}

	function resourceGroup(
		definition: ResourceGroupDefinitionOptions = {},
	): ResourceV2GroupDefinition {
		const id = definition.id ?? nextId('resourceGroup');
		const parentId = definition.parentId ?? `${id}_parent`;
		const parentOrder =
			typeof definition.parentOrder === 'number'
				? definition.parentOrder
				: nextGroupOrder++;

		const parent = {
			id: parentId,
			icon: definition.parentIcon ?? 'icon-resource-generic',
			label: definition.parentLabel ?? parentId,
			description:
				definition.parentDescription ?? definition.parentLabel ?? parentId,
			order: parentOrder,
			limited: true as const,
		} satisfies ResourceV2GroupDefinition['parent'] &
			ResourceV2GroupDefinitionConfig['parent'];

		const built: ResourceV2GroupDefinition = {
			id,
			parent,
		} satisfies ResourceV2GroupDefinition & ResourceV2GroupDefinitionConfig;

		resourceGroups.add(built);
		return built;
	}

	function resourceTierTrack(
		definition: ResourceTierTrackOptions = {},
	): ResourceV2TierTrack {
		const id = definition.id ?? nextId('resourceTierTrack');
		const builder = resourceV2TierTrack(id);

		const steps = definition.steps ?? [{ id: `${id}_step`, min: 0 }];
		for (const step of steps) {
			builder.step(step);
		}

		if (definition.display) {
			builder.display(definition.display);
		}

		if (definition.configure) {
			definition.configure(builder);
		}

		const built = builder.build();
		return built satisfies ResourceV2TierTrack & ResourceV2TierTrackConfig;
	}

	return {
		categories,
		actions,
		buildings,
		developments,
		populations,
		resourceDefinitions,
		resourceGroups,
		category,
		action,
		building,
		development,
		population,
		resourceDefinition,
		resourceGroup,
		resourceTierTrack,
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
