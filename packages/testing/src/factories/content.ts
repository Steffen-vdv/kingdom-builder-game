import {
	createActionCategoryRegistry,
	createActionRegistry,
	createBuildingRegistry,
	createDevelopmentRegistry,
	createPopulationRegistry,
	resourceV2Definition as resourceV2DefinitionBuilder,
	resourceV2Group as resourceV2GroupBuilder,
	resourceV2GroupParent as resourceV2GroupParentBuilder,
	resourceV2TierTrack as resourceV2TierTrackBuilder,
	type ActionCategoryConfig as ContentActionCategoryConfig,
} from '@kingdom-builder/contents';
import type {
	ActionCategoryConfig as SessionActionCategoryConfig,
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	Registry,
	ResourceV2Definition,
	ResourceV2GlobalActionCostMetadata,
	ResourceV2GroupDefinition,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';

let seq = 0;
function nextId(prefix: string) {
	seq += 1;
	return `${prefix}_${seq}`;
}

let nextResourceOrder = 0;
let nextResourceGroupOrder = 0;
let nextResourceGroupParentOrder = 0;

export interface ContentFactory {
	categories: Registry<ContentActionCategoryConfig>;
	actions: Registry<ActionConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	category(
		definition?: Partial<ContentActionCategoryConfig>,
	): ContentActionCategoryConfig;
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

type TierTrackConfigurator = (
	builder: ReturnType<typeof resourceV2TierTrackBuilder>,
) => void;

interface ResourceBoundsOverrides {
	lowerBound?: number;
	upperBound?: number;
}

export interface ResourceV2DefinitionFactoryOptions {
	id?: string;
	name?: string;
	icon?: string;
	description?: string;
	order?: number;
	displayAsPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	bounds?: ResourceBoundsOverrides;
	tierTrack?: ResourceV2TierTrackDefinition | TierTrackConfigurator;
	group?: { groupId: string; order?: number };
	globalActionCost?: number | ResourceV2GlobalActionCostMetadata;
}

export interface ResourceV2GroupFactoryOptions {
	id?: string;
	order?: number;
	children?: ReadonlyArray<string>;
	parentId?: string;
	parentName?: string;
	parentIcon?: string;
	parentDescription?: string;
	parentOrder?: number;
	parentDisplayAsPercent?: boolean;
	parentTrackValueBreakdown?: boolean;
	parentTrackBoundBreakdown?: boolean;
	parentBounds?: ResourceBoundsOverrides;
	parentTierTrack?: ResourceV2TierTrackDefinition | TierTrackConfigurator;
}

function applyBounds(
	builder:
		| ReturnType<typeof resourceV2DefinitionBuilder>
		| ReturnType<typeof resourceV2GroupParentBuilder>,
	bounds?: ResourceBoundsOverrides,
) {
	if (!bounds) {
		return;
	}

	if (bounds.lowerBound !== undefined) {
		builder.lowerBound(bounds.lowerBound);
	}

	if (bounds.upperBound !== undefined) {
		builder.upperBound(bounds.upperBound);
	}
}

function resolveTierTrack(
	id: string,
	definition?: ResourceV2TierTrackDefinition | TierTrackConfigurator,
) {
	if (!definition) {
		return undefined;
	}

	if (typeof definition === 'function') {
		const builder = resourceV2TierTrackBuilder(`${id}_tierTrack`);
		definition(builder);
		return builder.build();
	}

	return definition;
}

export function createResourceV2Definition(
	overrides: ResourceV2DefinitionFactoryOptions = {},
): ResourceV2Definition {
	const id = overrides.id ?? nextId('resourceV2');
	const order = overrides.order ?? nextResourceOrder++;
	const builder = resourceV2DefinitionBuilder(id)
		.name(overrides.name ?? id)
		.order(order)
		.icon(overrides.icon ?? 'icon-resource-generic');

	if (overrides.description) {
		builder.description(overrides.description);
	}

	if (overrides.displayAsPercent !== undefined) {
		builder.displayAsPercent(overrides.displayAsPercent);
	}

	if (overrides.trackValueBreakdown !== undefined) {
		builder.trackValueBreakdown(overrides.trackValueBreakdown);
	}

	if (overrides.trackBoundBreakdown !== undefined) {
		builder.trackBoundBreakdown(overrides.trackBoundBreakdown);
	}

	applyBounds(builder, overrides.bounds);

	const tierTrack = resolveTierTrack(id, overrides.tierTrack);
	if (tierTrack) {
		builder.tierTrack(tierTrack);
	}

	if (overrides.group) {
		builder.group(overrides.group.groupId, overrides.group.order ?? 0);
	}

	if (overrides.globalActionCost !== undefined) {
		const amount =
			typeof overrides.globalActionCost === 'number'
				? overrides.globalActionCost
				: overrides.globalActionCost.amount;
		builder.globalActionCost(amount);
	}

	return builder.build();
}

export function createResourceV2Group(
	overrides: ResourceV2GroupFactoryOptions = {},
): ResourceV2GroupDefinition {
	const id = overrides.id ?? nextId('resourceGroup');
	const order = overrides.order ?? nextResourceGroupOrder++;
	const parentId = overrides.parentId ?? `${id}_parent`;
	const parentOrder = overrides.parentOrder ?? nextResourceGroupParentOrder++;
	const parentBuilder = resourceV2GroupParentBuilder(parentId)
		.name(overrides.parentName ?? parentId)
		.order(parentOrder)
		.icon(overrides.parentIcon ?? 'icon-resource-group');

	if (overrides.parentDescription) {
		parentBuilder.description(overrides.parentDescription);
	}

	if (overrides.parentDisplayAsPercent !== undefined) {
		parentBuilder.displayAsPercent(overrides.parentDisplayAsPercent);
	}

	if (overrides.parentTrackValueBreakdown !== undefined) {
		parentBuilder.trackValueBreakdown(overrides.parentTrackValueBreakdown);
	}

	if (overrides.parentTrackBoundBreakdown !== undefined) {
		parentBuilder.trackBoundBreakdown(overrides.parentTrackBoundBreakdown);
	}

	applyBounds(parentBuilder, overrides.parentBounds);

	const parentTierTrack = resolveTierTrack(parentId, overrides.parentTierTrack);
	if (parentTierTrack) {
		parentBuilder.tierTrack(parentTierTrack);
	}

	const groupBuilder = resourceV2GroupBuilder(id)
		.order(order)
		.parent(parentBuilder);

	const children =
		overrides.children && overrides.children.length
			? [...overrides.children]
			: [nextId('resourceV2_member')];

	groupBuilder.children(children);

	return groupBuilder.build();
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
