import type {
	Registry,
	ResourceV2Definition,
	ResourceV2GlobalActionCost,
	ResourceV2GroupMetadata,
	ResourceV2GroupParent,
	ResourceV2ReconciliationStrategy,
	ResourceV2RoundingMode,
	ResourceV2TierDefinition,
	ResourceV2TierTrack,
} from '@kingdom-builder/protocol';

const INTEGER_FORMATTER = new Intl.NumberFormat('en-US');

const clone = <T>(value: T): T => structuredClone(value);

const formatNumber = (value: number): string => INTEGER_FORMATTER.format(value);

const formatPercent = (value: number): string => `${formatNumber(value)}%`;

const formatSigned = (
	value: number,
	formatter: (amount: number) => string,
): string => {
	if (value === 0) {
		return formatter(0);
	}
	const formatted = formatter(Math.abs(value));
	return value > 0 ? `+${formatted}` : `-${formatted}`;
};

export enum ResourceV2Reconciliation {
	Clamp = 'clamp',
	Pass = 'pass',
	Reject = 'reject',
}

export enum ResourceV2Rounding {
	Up = 'up',
	Down = 'down',
	Nearest = 'nearest',
}

export type ResourceV2ReconciliationValue = ResourceV2ReconciliationStrategy;

export type ResourceV2RoundingValue = ResourceV2RoundingMode;

export interface ResourceV2RuntimeTierDefinition {
	id: string;
	range: ResourceV2TierDefinition['range'];
	enterEffects?: ResourceV2TierDefinition['enterEffects'];
	exitEffects?: ResourceV2TierDefinition['exitEffects'];
	passivePreview?: ResourceV2TierDefinition['passivePreview'];
	text?: ResourceV2TierDefinition['text'];
	display?: ResourceV2TierDefinition['display'];
}

export interface ResourceV2RuntimeTierTrack {
	id: string;
	title?: string;
	description?: string;
	tiers: ResourceV2RuntimeTierDefinition[];
}

interface ResourceV2RuntimeBaseMetadata {
	id: string;
	name: string;
	icon?: string;
	description?: string;
	order: number;
	isPercent: boolean;
	lowerBound?: number;
	upperBound?: number;
	trackValueBreakdown: boolean;
	trackBoundBreakdown: boolean;
	tierTrack?: ResourceV2RuntimeTierTrack;
	metadata: Record<string, unknown>;
	limited: boolean;
	formatValue(value: number): string;
	formatDelta(amount: number): string;
}

export interface ResourceV2RuntimeDefinition
	extends ResourceV2RuntimeBaseMetadata {
	groupId?: string;
	parentId?: string;
	globalActionCost?: ResourceV2GlobalActionCost;
}

export interface ResourceV2RuntimeGroupParent
	extends ResourceV2RuntimeBaseMetadata {
	relation: ResourceV2GroupParent['relation'];
}

export interface ResourceV2RuntimeGroup {
	id: string;
	name: string;
	icon?: string;
	description?: string;
	order: number;
	children: string[];
	metadata: Record<string, unknown>;
	parent?: ResourceV2RuntimeGroupParent;
}

export interface ResourceV2RuntimeCatalog {
	resourcesById: Record<string, ResourceV2RuntimeDefinition>;
	orderedResourceIds: string[];
	groupsById: Record<string, ResourceV2RuntimeGroup>;
	orderedGroupIds: string[];
	parentsById: Record<string, ResourceV2RuntimeGroupParent>;
	parentIdByResourceId: Record<string, string>;
}

const toRuntimeTierDefinition = (
	definition: ResourceV2TierDefinition,
): ResourceV2RuntimeTierDefinition => {
	const runtime: ResourceV2RuntimeTierDefinition = {
		id: definition.id,
		range: { ...definition.range },
	};
	if (definition.enterEffects) {
		runtime.enterEffects = definition.enterEffects.map((effect) =>
			clone(effect),
		);
	}
	if (definition.exitEffects) {
		runtime.exitEffects = definition.exitEffects.map((effect) => clone(effect));
	}
	if (definition.passivePreview) {
		runtime.passivePreview = clone(definition.passivePreview);
	}
	if (definition.text) {
		runtime.text = { ...definition.text };
	}
	if (definition.display) {
		runtime.display = { ...definition.display };
	}
	return runtime;
};

const toRuntimeTierTrack = (
	track: ResourceV2TierTrack,
): ResourceV2RuntimeTierTrack => {
	const runtime: ResourceV2RuntimeTierTrack = {
		id: track.id,
		tiers: track.tiers.map((tier) => toRuntimeTierDefinition(tier)),
	};
	if (track.title !== undefined) {
		runtime.title = track.title;
	}
	if (track.description !== undefined) {
		runtime.description = track.description;
	}
	return runtime;
};

const buildFormatter = (isPercent: boolean) => {
	const valueFormatter = isPercent ? formatPercent : formatNumber;
	const deltaFormatter = (amount: number) =>
		formatSigned(amount, isPercent ? formatPercent : formatNumber);
	return { valueFormatter, deltaFormatter };
};

const toRuntimeDefinition = (
	definition: ResourceV2Definition,
	parentId?: string,
): ResourceV2RuntimeDefinition => {
	const isPercent = definition.isPercent ?? false;
	const { valueFormatter, deltaFormatter } = buildFormatter(isPercent);
	const runtime: ResourceV2RuntimeDefinition = {
		id: definition.id,
		name: definition.name,
		order: definition.order,
		isPercent,
		trackValueBreakdown: definition.trackValueBreakdown ?? false,
		trackBoundBreakdown: definition.trackBoundBreakdown ?? false,
		metadata: definition.metadata ? { ...definition.metadata } : {},
		limited: definition.limited ?? false,
		formatValue: valueFormatter,
		formatDelta: deltaFormatter,
	};
	if (definition.icon !== undefined) {
		runtime.icon = definition.icon;
	}
	if (definition.description !== undefined) {
		runtime.description = definition.description;
	}
	if (definition.lowerBound !== undefined) {
		runtime.lowerBound = definition.lowerBound;
	}
	if (definition.upperBound !== undefined) {
		runtime.upperBound = definition.upperBound;
	}
	if (definition.tierTrack) {
		runtime.tierTrack = toRuntimeTierTrack(definition.tierTrack);
	}
	if (definition.groupId !== undefined) {
		runtime.groupId = definition.groupId;
	}
	if (parentId !== undefined) {
		runtime.parentId = parentId;
	}
	if (definition.globalActionCost) {
		runtime.globalActionCost = { ...definition.globalActionCost };
	}
	return runtime;
};

const toRuntimeParent = (
	parent: ResourceV2GroupParent,
): ResourceV2RuntimeGroupParent => {
	const isPercent = parent.isPercent ?? false;
	const { valueFormatter, deltaFormatter } = buildFormatter(isPercent);
	const runtime: ResourceV2RuntimeGroupParent = {
		id: parent.id,
		name: parent.name,
		order: parent.order,
		isPercent,
		trackValueBreakdown: parent.trackValueBreakdown ?? false,
		trackBoundBreakdown: parent.trackBoundBreakdown ?? false,
		metadata: parent.metadata ? { ...parent.metadata } : {},
		limited: parent.limited ?? false,
		formatValue: valueFormatter,
		formatDelta: deltaFormatter,
		relation: parent.relation,
	};
	if (parent.icon !== undefined) {
		runtime.icon = parent.icon;
	}
	if (parent.description !== undefined) {
		runtime.description = parent.description;
	}
	if (parent.lowerBound !== undefined) {
		runtime.lowerBound = parent.lowerBound;
	}
	if (parent.upperBound !== undefined) {
		runtime.upperBound = parent.upperBound;
	}
	if (parent.tierTrack) {
		runtime.tierTrack = toRuntimeTierTrack(parent.tierTrack);
	}
	return runtime;
};

const toRuntimeGroup = (
	metadata: ResourceV2GroupMetadata,
): ResourceV2RuntimeGroup => {
	const runtime: ResourceV2RuntimeGroup = {
		id: metadata.id,
		name: metadata.name,
		order: metadata.order,
		children: [...metadata.children],
		metadata: metadata.metadata ? { ...metadata.metadata } : {},
	};
	if (metadata.icon !== undefined) {
		runtime.icon = metadata.icon;
	}
	if (metadata.description !== undefined) {
		runtime.description = metadata.description;
	}
	if (metadata.parent) {
		runtime.parent = toRuntimeParent(metadata.parent);
	}
	return runtime;
};

const sortByOrder = <T extends { order: number }>(values: T[]): T[] =>
	[...values].sort((a, b) => a.order - b.order);

export function hydrateResourceV2Metadata(
	resources: Registry<ResourceV2Definition>,
	groups: Registry<ResourceV2GroupMetadata>,
): ResourceV2RuntimeCatalog {
	const runtimeGroups = sortByOrder(
		groups.values().map((group) => toRuntimeGroup(group)),
	);
	const groupsById: Record<string, ResourceV2RuntimeGroup> = {};
	const parentsById: Record<string, ResourceV2RuntimeGroupParent> = {};
	const parentIdByResourceId: Record<string, string> = {};

	for (const group of runtimeGroups) {
		groupsById[group.id] = group;
		if (group.parent) {
			parentsById[group.parent.id] = group.parent;
			for (const child of group.children) {
				parentIdByResourceId[child] = group.parent.id;
			}
		}
	}

	const runtimeResources = sortByOrder(
		resources
			.values()
			.map((definition) =>
				toRuntimeDefinition(definition, parentIdByResourceId[definition.id]),
			),
	);
	const resourcesById: Record<string, ResourceV2RuntimeDefinition> = {};
	for (const resource of runtimeResources) {
		resourcesById[resource.id] = resource;
	}

	return {
		resourcesById,
		orderedResourceIds: runtimeResources.map((resource) => resource.id),
		groupsById,
		orderedGroupIds: runtimeGroups.map((group) => group.id),
		parentsById,
		parentIdByResourceId,
	};
}
