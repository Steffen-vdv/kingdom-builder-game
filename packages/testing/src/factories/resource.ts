import {
	createResourceGroupRegistry,
	createResourceRegistry,
	resourceGroup,
	resource,
	type ResourceBoundReference,
	type ResourceBoundValue,
	type ResourceGroupBuilder,
	type ResourceGroupRegistry,
	type ResourceReconciliationMode,
	type ResourceBuilder,
	type ResourceRegistry,
} from '@kingdom-builder/contents';

type ResourceDefinition = ReturnType<ResourceBuilder['build']>;
type ResourceGroupDefinition = ReturnType<ResourceGroupBuilder['build']>;
type ResourceTierTrack = Parameters<ResourceBuilder['tierTrack']>[0];
type ResourceGroupParent = NonNullable<ResourceGroupDefinition['parent']>;

let seq = 0;
function nextId(prefix: string) {
	seq += 1;
	return `${prefix}_${seq}`;
}

export interface ResourceGroupLink {
	id: string;
	order?: number;
}

export interface ResourceMetadataOverrides {
	label?: string;
	icon?: string;
	description?: string;
	order?: number;
	tags?: readonly string[];
	group?: ResourceGroupLink;
	displayAsPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
}

/**
 * Bound overrides can be static numbers or dynamic references to other
 * resources. Use `{ resourceId: 'other-resource' }` for dynamic bounds.
 */
export interface ResourceBoundsOverrides {
	lowerBound?: ResourceBoundValue;
	upperBound?: ResourceBoundValue;
}

export interface ResourceGlobalCostOverride {
	amount: number;
}

export interface ResourceDefinitionOverrides {
	id?: string;
	metadata?: ResourceMetadataOverrides;
	bounds?: ResourceBoundsOverrides;
	tierTrack?: ResourceTierTrack;
	globalCost?: number | ResourceGlobalCostOverride;
}

function applyResourceMetadata(
	builder: ResourceBuilder,
	id: string,
	overrides: ResourceMetadataOverrides = {},
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

export function resourceDefinition(
	overrides: ResourceDefinitionOverrides = {},
): ResourceDefinition {
	const id = overrides.id ?? nextId('resource');
	const builder = resource(id);
	applyResourceMetadata(builder, id, overrides.metadata);

	const lowerBound = overrides.bounds?.lowerBound;
	const upperBound = overrides.bounds?.upperBound;
	if (lowerBound !== undefined) {
		builder.lowerBound(lowerBound);
	}
	if (upperBound !== undefined) {
		builder.upperBound(upperBound);
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

export interface ResourceGroupParentOverrides {
	id?: string;
	label?: string;
	icon?: string;
	description?: string;
	order?: number;
	lowerBound?: ResourceBoundValue;
	upperBound?: ResourceBoundValue;
	tierTrack?: ResourceTierTrack;
	displayAsPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
}

/**
 * Helper to create a bound reference for testing dynamic bounds.
 * When the referenced resource changes, cascading reconciliation applies.
 *
 * @param resourceId - Resource whose value acts as the bound
 * @param reconciliation - 'clamp' (default), 'pass', or 'reject'
 *
 * @example
 * resourceDefinition({
 *   bounds: { upperBound: boundRef('max-population') }
 * })
 *
 * Note: Avoid circular bound references in tests. If A bounds B and B bounds A,
 * neither can increase beyond 0.
 */
export function boundRef(
	resourceId: string,
	reconciliation?: ResourceReconciliationMode,
): ResourceBoundReference {
	return reconciliation ? { resourceId, reconciliation } : { resourceId };
}

export interface ResourceGroupDefinitionOverrides {
	id?: string;
	order?: number;
	parent?: ResourceGroupParentOverrides;
}

interface ParentMetadata {
	id: string;
	label: string;
	icon: string;
	description?: string;
}

function resolveParentMetadata(
	groupId: string,
	overrides: ResourceGroupParentOverrides,
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
	overrides: ResourceGroupParentOverrides,
): ResourceGroupParent {
	const parent: ResourceGroupParent = { ...metadata };
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

export function resourceGroupDefinition(
	overrides: ResourceGroupDefinitionOverrides = {},
): ResourceGroupDefinition {
	const id = overrides.id ?? nextId('resourceGroup');
	const builder = resourceGroup(id);

	if (typeof overrides.order === 'number') {
		builder.order(overrides.order);
	}

	let parent: ResourceGroupParent | undefined;
	if (overrides.parent) {
		const metadata = resolveParentMetadata(id, overrides.parent);
		builder.parent(metadata);
		parent = buildParent(metadata, overrides.parent);
	}

	const baseDefinition = builder.build();
	if (!parent) {
		return baseDefinition;
	}
	return { ...baseDefinition, parent } satisfies ResourceGroupDefinition;
}

export interface ResourceRegistryMaterialiserInput {
	resources?: readonly ResourceDefinition[];
	groups?: readonly ResourceGroupDefinition[];
}

export interface ResourceRegistryMaterialiserOutput {
	resources: ResourceRegistry;
	groups: ResourceGroupRegistry;
}

export function createResourceRegistries(
	input: ResourceRegistryMaterialiserInput = {},
): ResourceRegistryMaterialiserOutput {
	const resources = input.resources ?? [];
	const groups = input.groups ?? [];

	return {
		resources: createResourceRegistry(resources),
		groups: createResourceGroupRegistry(groups),
	};
}
