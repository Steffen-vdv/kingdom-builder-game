import {
	createResourceGroupV2Registry,
	createResourceV2Registry,
} from '@kingdom-builder/contents';
import {
	ResourceV2Builder,
	ResourceV2GroupBuilder,
	ResourceV2GroupParentBuilder,
	ResourceV2TierBuilder,
	ResourceV2TierTrackBuilder,
} from '@kingdom-builder/contents/config/builders';
import {
	Registry,
	resourceV2DefinitionSchema,
	resourceV2GroupMetadataSchema,
	type ResourceV2Definition,
	type ResourceV2GroupMetadata,
	type ResourceV2GroupParent,
	type ResourceV2TierDefinition,
	type ResourceV2TierTrack,
} from '@kingdom-builder/protocol';
import {
	buildResourceV2SessionMetadata,
	type ResourceV2SessionMetadata,
} from './resourceV2Metadata';
type ResourceV2TierTrackInput =
	| ResourceV2TierTrack
	| ResourceV2TierTrackBuilder
	| ((builder: ResourceV2TierTrackBuilder) => ResourceV2TierTrackBuilder);
type ResourceV2TierInput =
	| ResourceV2TierDefinition
	| ResourceV2TierBuilder
	| ((builder: ResourceV2TierBuilder) => ResourceV2TierBuilder);
export type ResourceV2DefinitionInput =
	| ResourceV2Definition
	| ResourceV2Builder
	| ((builder: ResourceV2Builder) => ResourceV2Builder)
	| ResourceV2DefinitionFactoryOptions;
type ResourceV2DefinitionFactoryOptions = Partial<
	Omit<ResourceV2Definition, 'tierTrack' | 'globalActionCost'>
> & {
	tierTrack?: ResourceV2TierTrackInput;
	globalActionCost?: number | ResourceV2Definition['globalActionCost'];
};
export type ResourceV2GroupParentInput =
	| ResourceV2GroupParent
	| ResourceV2GroupParentBuilder
	| ((builder: ResourceV2GroupParentBuilder) => ResourceV2GroupParentBuilder)
	| ResourceV2GroupParentFactoryOptions;
type ResourceV2GroupParentFactoryOptions = Partial<ResourceV2GroupParent>;
export type ResourceV2GroupInput =
	| ResourceV2GroupMetadata
	| ResourceV2GroupBuilder
	| ((builder: ResourceV2GroupBuilder) => ResourceV2GroupBuilder)
	| ResourceV2GroupFactoryOptions;
type ResourceV2GroupFactoryOptions = Partial<
	Omit<ResourceV2GroupMetadata, 'parent'>
> & {
	parent?: ResourceV2GroupParentInput;
};
const isBuilder = <T>(
	value: unknown,
	ctor: abstract new (...args: never[]) => T,
): value is T => typeof value === 'object' && value instanceof ctor;
const clone = <T>(value: T): T => structuredClone(value);
const buildTier = (tier: ResourceV2TierInput): ResourceV2TierDefinition =>
	typeof tier === 'function'
		? tier(new ResourceV2TierBuilder()).build()
		: isBuilder(tier, ResourceV2TierBuilder)
			? tier.build()
			: clone(tier);
const buildTierTrack = (
	track: ResourceV2TierTrackInput,
): ResourceV2TierTrack => {
	if (typeof track === 'function') {
		return track(new ResourceV2TierTrackBuilder()).build();
	}
	if (isBuilder(track, ResourceV2TierTrackBuilder)) {
		return track.build();
	}
	const cloned = clone(track);
	return { ...cloned, tiers: cloned.tiers.map((tier) => buildTier(tier)) };
};
const isResourceV2Definition = (
	value: unknown,
): value is ResourceV2Definition =>
	typeof value === 'object' &&
	value !== null &&
	typeof (value as { id?: unknown }).id === 'string' &&
	typeof (value as { name?: unknown }).name === 'string' &&
	typeof (value as { order?: unknown }).order === 'number';
const isResourceV2Group = (value: unknown): value is ResourceV2GroupMetadata =>
	typeof value === 'object' &&
	value !== null &&
	typeof (value as { id?: unknown }).id === 'string' &&
	typeof (value as { name?: unknown }).name === 'string' &&
	typeof (value as { order?: unknown }).order === 'number' &&
	Array.isArray((value as { children?: unknown }).children);
const isResourceV2GroupParent = (
	value: unknown,
): value is ResourceV2GroupParent =>
	typeof value === 'object' &&
	value !== null &&
	typeof (value as { id?: unknown }).id === 'string' &&
	typeof (value as { name?: unknown }).name === 'string' &&
	typeof (value as { order?: unknown }).order === 'number';
const nextOrder = <T extends { order: number }>(values: T[]): number =>
	values.reduce((max, entry) => Math.max(max, entry.order), -1) + 1;

const nextParentOrder = (groups: ResourceV2GroupMetadata[]): number => {
	const orders = groups
		.map((group) => group.parent?.order)
		.filter((value): value is number => value !== undefined);
	return (orders.length ? Math.max(...orders) : -1) + 1;
};

export interface ResourceV2Factory {
	resources: Registry<ResourceV2Definition>;
	groups: Registry<ResourceV2GroupMetadata>;
	createResource(definition?: ResourceV2DefinitionInput): ResourceV2Definition;
	createGroup(definition?: ResourceV2GroupInput): ResourceV2GroupMetadata;
	createParent(definition?: ResourceV2GroupParentInput): ResourceV2GroupParent;
	buildSessionMetadata(): ResourceV2SessionMetadata;
}

export function createResourceV2Factory(
	generateId: (prefix: string) => string,
): ResourceV2Factory {
	const resources = new Registry<ResourceV2Definition>(
		resourceV2DefinitionSchema,
	);
	const groups = new Registry<ResourceV2GroupMetadata>(
		resourceV2GroupMetadataSchema,
	);

	Object.values(createResourceV2Registry()).forEach((definition) => {
		resources.add(definition.id, clone(definition));
	});
	Object.values(createResourceGroupV2Registry()).forEach((group) => {
		groups.add(group.id, clone(group));
	});
	let nextResourceOrder = nextOrder(resources.values());
	let nextGroupOrder = nextOrder(groups.values());
	let nextGroupParentOrder = nextParentOrder(groups.values());

	const buildResourceGroupParent = (
		definition: ResourceV2GroupParentInput = {},
	): ResourceV2GroupParent => {
		if (typeof definition === 'function') {
			return definition(new ResourceV2GroupParentBuilder()).build();
		}
		if (isBuilder(definition, ResourceV2GroupParentBuilder)) {
			return definition.build();
		}
		if (isResourceV2GroupParent(definition)) {
			return clone(definition);
		}
		const builder = new ResourceV2GroupParentBuilder();
		const options: ResourceV2GroupParentFactoryOptions = definition;
		const id = options.id ?? generateId('resourceV2-group-parent');
		builder.id(id);
		builder.name(options.name ?? id);
		if (options.icon !== undefined) {
			builder.icon(options.icon);
		}
		if (options.description !== undefined) {
			builder.description(options.description);
		}
		if (options.order !== undefined) {
			builder.order(options.order);
		} else {
			builder.order(nextGroupParentOrder);
			nextGroupParentOrder += 1;
		}
		if (options.isPercent !== undefined) {
			builder.percent(options.isPercent);
		}
		if (options.lowerBound !== undefined) {
			builder.lowerBound(options.lowerBound);
		}
		if (options.upperBound !== undefined) {
			builder.upperBound(options.upperBound);
		}
		if (options.trackValueBreakdown !== undefined) {
			builder.trackValueBreakdown(options.trackValueBreakdown);
		}
		if (options.trackBoundBreakdown !== undefined) {
			builder.trackBoundBreakdown(options.trackBoundBreakdown);
		}
		if (options.tierTrack !== undefined) {
			builder.tierTrack(buildTierTrack(options.tierTrack));
		}
		if (options.metadata !== undefined) {
			builder.metadata(options.metadata);
		}
		return builder.build();
	};

	const buildResourceDefinition = (
		definition: ResourceV2DefinitionInput = {},
	): ResourceV2Definition => {
		if (typeof definition === 'function') {
			return definition(new ResourceV2Builder()).build();
		}
		if (isBuilder(definition, ResourceV2Builder)) {
			return definition.build();
		}
		if (isResourceV2Definition(definition)) {
			return clone(definition);
		}
		const builder = new ResourceV2Builder();
		const options: ResourceV2DefinitionFactoryOptions = definition;
		const id = options.id ?? generateId('resourceV2');
		builder.id(id);
		builder.name(options.name ?? id);
		if (options.icon !== undefined) {
			builder.icon(options.icon);
		}
		if (options.description !== undefined) {
			builder.description(options.description);
		}
		if (options.order !== undefined) {
			builder.order(options.order);
		} else {
			builder.order(nextResourceOrder);
			nextResourceOrder += 1;
		}
		if (options.isPercent !== undefined) {
			builder.percent(options.isPercent);
		}
		if (options.lowerBound !== undefined) {
			builder.lowerBound(options.lowerBound);
		}
		if (options.upperBound !== undefined) {
			builder.upperBound(options.upperBound);
		}
		if (options.trackValueBreakdown !== undefined) {
			builder.trackValueBreakdown(options.trackValueBreakdown);
		}
		if (options.trackBoundBreakdown !== undefined) {
			builder.trackBoundBreakdown(options.trackBoundBreakdown);
		}
		if (options.tierTrack !== undefined) {
			builder.tierTrack(buildTierTrack(options.tierTrack));
		}
		if (options.metadata !== undefined) {
			builder.metadata(options.metadata);
		}
		if (options.groupId !== undefined) {
			builder.groupId(options.groupId);
		}
		if (options.globalActionCost !== undefined) {
			const amount =
				typeof options.globalActionCost === 'number'
					? options.globalActionCost
					: options.globalActionCost?.amount;
			if (amount !== undefined) {
				builder.globalActionCost(amount);
			}
		}
		if (options.limited !== undefined) {
			builder.limited(options.limited);
		}
		return builder.build();
	};

	const createResource = (
		definition: ResourceV2DefinitionInput = {},
	): ResourceV2Definition => {
		const built = buildResourceDefinition(definition);
		resources.add(built.id, built);
		return built;
	};

	const buildResourceGroup = (
		definition: ResourceV2GroupInput = {},
	): ResourceV2GroupMetadata => {
		if (typeof definition === 'function') {
			return definition(new ResourceV2GroupBuilder()).build();
		}
		if (isBuilder(definition, ResourceV2GroupBuilder)) {
			return definition.build();
		}
		if (isResourceV2Group(definition)) {
			return clone(definition);
		}
		const builder = new ResourceV2GroupBuilder();
		const options: ResourceV2GroupFactoryOptions = definition;
		const id = options.id ?? generateId('resourceV2-group');
		builder.id(id);
		builder.name(options.name ?? id);
		if (options.icon !== undefined) {
			builder.icon(options.icon);
		}
		if (options.description !== undefined) {
			builder.description(options.description);
		}
		if (options.order !== undefined) {
			builder.order(options.order);
		} else {
			builder.order(nextGroupOrder);
			nextGroupOrder += 1;
		}

		const parent =
			options.parent !== undefined
				? buildResourceGroupParent(options.parent)
				: buildResourceGroupParent();
		builder.parent(parent);

		const children = options.children ?? [createResource().id];
		builder.children(children);

		if (options.metadata !== undefined) {
			builder.metadata(options.metadata);
		}

		return builder.build();
	};

	const createGroup = (
		definition: ResourceV2GroupInput = {},
	): ResourceV2GroupMetadata => {
		const built = buildResourceGroup(definition);
		groups.add(built.id, built);
		return built;
	};

	const createParent = (
		definition: ResourceV2GroupParentInput = {},
	): ResourceV2GroupParent => buildResourceGroupParent(definition);

	const buildSessionMetadata = (): ResourceV2SessionMetadata =>
		buildResourceV2SessionMetadata(resources.values(), groups.values());

	return {
		resources,
		groups,
		createResource,
		createGroup,
		createParent,
		buildSessionMetadata,
	};
}

export type { ResourceV2SessionMetadata } from './resourceV2Metadata';
