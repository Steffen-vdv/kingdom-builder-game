import {
	createResourceGroupRegistry,
	createResourceV2Registry,
	resourceGroup,
	resourceV2,
	type ResourceGroupBuilder,
	type ResourceGroupRegistry,
	type ResourceV2Builder,
	type ResourceV2Registry,
} from '@kingdom-builder/contents/resourceV2';

type ResourceV2Definition = ReturnType<ResourceV2Builder['build']>;
type ResourceV2GroupDefinition = ReturnType<ResourceGroupBuilder['build']>;
type ResourceV2TierTrack = Parameters<ResourceV2Builder['tierTrack']>[0];
type ResourceV2GroupParent = NonNullable<ResourceV2GroupDefinition['parent']>;

let seq = 0;
function nextId(prefix: string) {
	seq += 1;
	return `${prefix}_${seq}`;
}

export interface ResourceV2GroupLink {
	id: string;
	order?: number;
}

export interface ResourceV2MetadataOverrides {
	label?: string;
	icon?: string;
	description?: string;
	order?: number;
	tags?: readonly string[];
	group?: ResourceV2GroupLink;
	displayAsPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
}

export interface ResourceV2BoundsOverrides {
	lowerBound?: number;
	upperBound?: number;
}

export interface ResourceV2GlobalCostOverride {
	amount: number;
}

export interface ResourceV2DefinitionOverrides {
	id?: string;
	metadata?: ResourceV2MetadataOverrides;
	bounds?: ResourceV2BoundsOverrides;
	tierTrack?: ResourceV2TierTrack;
	globalCost?: number | ResourceV2GlobalCostOverride;
}

function applyResourceMetadata(
	builder: ResourceV2Builder,
	id: string,
	overrides: ResourceV2MetadataOverrides = {},
) {
	const label = overrides.label ?? id;
	const icon = overrides.icon ?? 'icon-resource-generic';
	builder.label(label).icon(icon);

	if (overrides.description) {
		builder.description(overrides.description);
	}
	if (typeof overrides.order === 'number') {
		builder.order(overrides.order);
	}
	if (overrides.group) {
		const options =
			overrides.group.order !== undefined
				? { order: overrides.group.order }
				: undefined;
		builder.group(overrides.group.id, options);
	}
	if (overrides.tags?.length) {
		builder.tags(...overrides.tags);
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
}

export function resourceV2Definition(
	overrides: ResourceV2DefinitionOverrides = {},
): ResourceV2Definition {
	const id = overrides.id ?? nextId('resourceV2');
	const builder = resourceV2(id);
	applyResourceMetadata(builder, id, overrides.metadata);

	const lowerBound = overrides.bounds?.lowerBound;
	const upperBound = overrides.bounds?.upperBound;
	if (lowerBound !== undefined || upperBound !== undefined) {
		builder.bounds(lowerBound, upperBound);
	}

	if (overrides.tierTrack) {
		builder.tierTrack(overrides.tierTrack);
	}

	if (overrides.globalCost !== undefined) {
		const amount =
			typeof overrides.globalCost === 'number'
				? overrides.globalCost
				: overrides.globalCost.amount;
		builder.globalActionCost(amount);
	}

	return builder.build();
}

export interface ResourceV2GroupParentOverrides {
	id?: string;
	label?: string;
	icon?: string;
	description?: string;
	order?: number;
	lowerBound?: number;
	upperBound?: number;
	tierTrack?: ResourceV2TierTrack;
	displayAsPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
}

export interface ResourceV2GroupDefinitionOverrides {
	id?: string;
	order?: number;
	parent?: ResourceV2GroupParentOverrides;
}

interface ParentMetadata {
	id: string;
	label: string;
	icon: string;
	description?: string;
}

function resolveParentMetadata(
	groupId: string,
	overrides: ResourceV2GroupParentOverrides,
): ParentMetadata {
	const id = overrides.id ?? `${groupId}_parent`;
	const label = overrides.label ?? id;
	const icon = overrides.icon ?? 'icon-resource-group-generic';
	const metadata: ParentMetadata = { id, label, icon };
	if (overrides.description) {
		metadata.description = overrides.description;
	}
	return metadata;
}

function buildParent(
	metadata: ParentMetadata,
	overrides: ResourceV2GroupParentOverrides,
): ResourceV2GroupParent {
	const parent: ResourceV2GroupParent = { ...metadata };
	if (overrides.order !== undefined) {
		parent.order = overrides.order;
	}
	if (overrides.lowerBound !== undefined) {
		parent.lowerBound = overrides.lowerBound;
	}
	if (overrides.upperBound !== undefined) {
		parent.upperBound = overrides.upperBound;
	}
	if (overrides.tierTrack) {
		parent.tierTrack = overrides.tierTrack;
	}
	if (overrides.displayAsPercent !== undefined) {
		parent.displayAsPercent = overrides.displayAsPercent;
	}
	if (overrides.trackValueBreakdown !== undefined) {
		parent.trackValueBreakdown = overrides.trackValueBreakdown;
	}
	if (overrides.trackBoundBreakdown !== undefined) {
		parent.trackBoundBreakdown = overrides.trackBoundBreakdown;
	}
	return parent;
}

export function resourceV2GroupDefinition(
	overrides: ResourceV2GroupDefinitionOverrides = {},
): ResourceV2GroupDefinition {
	const id = overrides.id ?? nextId('resourceV2Group');
	const builder = resourceGroup(id);

	if (typeof overrides.order === 'number') {
		builder.order(overrides.order);
	}

	let parent: ResourceV2GroupParent | undefined;
	if (overrides.parent) {
		const metadata = resolveParentMetadata(id, overrides.parent);
		builder.parent(metadata);
		parent = buildParent(metadata, overrides.parent);
	}

	const baseDefinition = builder.build();
	if (!parent) {
		return baseDefinition;
	}
	return { ...baseDefinition, parent } satisfies ResourceV2GroupDefinition;
}

export interface ResourceV2RegistryMaterialiserInput {
	resources?: readonly ResourceV2Definition[];
	groups?: readonly ResourceV2GroupDefinition[];
}

export interface ResourceV2RegistryMaterialiserOutput {
	resources: ResourceV2Registry;
	groups: ResourceGroupRegistry;
}

export function createResourceV2Registries(
	input: ResourceV2RegistryMaterialiserInput = {},
): ResourceV2RegistryMaterialiserOutput {
	const resources = input.resources ?? [];
	const groups = input.groups ?? [];

	return {
		resources: createResourceV2Registry(resources),
		groups: createResourceGroupRegistry(groups),
	};
}
