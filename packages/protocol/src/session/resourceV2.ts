import type {
	ResourceV2DefinitionConfig,
	ResourceV2GroupDefinitionConfig,
	ResourceV2GlobalActionCostConfig,
} from '../resourceV2/definitions';

export type SessionMetadataFormat =
	| string
	| {
			prefix?: string;
			percent?: boolean;
	  };

export interface SessionResourceValueSnapshot {
	value: number;
	lowerBound?: number;
	upperBound?: number;
	touched?: boolean;
	valueBreakdown?: Record<string, number>;
	boundBreakdown?: Record<string, number>;
}

export type SessionResourceValueSnapshotMap = Record<
	string,
	SessionResourceValueSnapshot
>;

export interface SessionResourceValueDescriptor {
	id?: string;
	icon?: string;
	label?: string;
	description?: string;
	displayAsPercent?: boolean;
	format?: SessionMetadataFormat;
	order?: number;
	groupId?: string;
}

export interface SessionResourceGroupParentDescriptor {
	id: string;
	icon?: string;
	label?: string;
	description?: string;
	order?: number;
	limited?: boolean;
}

export interface SessionResourceGroupDescriptor {
	groupId: string;
	parent: SessionResourceGroupParentDescriptor;
	children?: readonly string[];
	order?: number;
}

export interface SessionResourceTierProgressSnapshot {
	current: number;
	min: number;
	max?: number;
}

export interface SessionResourceTierStepSnapshot {
	id: string;
	index: number;
	min: number;
	max?: number;
	label?: string;
}

export interface SessionResourceTierStatus {
	trackId: string;
	currentStepId?: string;
	currentStepIndex?: number;
	nextStepId?: string;
	previousStepId?: string;
	progress?: SessionResourceTierProgressSnapshot;
	steps?: readonly SessionResourceTierStepSnapshot[];
}

export interface SessionResourceRecentChange {
	resourceId: string;
	amount: number;
}

export interface SessionResourceGroupPresentation {
	groupId: string;
	parent: SessionResourceGroupParentDescriptor & { order: number };
	children: readonly SessionResourceValueDescriptor[];
}

export type SessionResourceOrderedValueEntry =
	| {
			kind: 'value';
			descriptor: SessionResourceValueDescriptor;
			groupId?: string;
	  }
	| {
			kind: 'group-parent';
			groupId: string;
			parent: SessionResourceGroupParentDescriptor & { order: number };
	  };

export interface SessionResourceValueMetadata {
	descriptors?: Record<string, SessionResourceValueDescriptor>;
	groups?: Record<string, SessionResourceGroupDescriptor>;
	tiers?: Record<string, SessionResourceTierStatus>;
	ordered?: readonly SessionResourceOrderedValueEntry[];
	recent?: readonly SessionResourceRecentChange[];
}

export interface SessionResourceGlobalCostReference
	extends ResourceV2GlobalActionCostConfig {
	resourceId: string;
}

export interface SessionResourceRegistryPayload {
	definitions: Record<string, ResourceV2DefinitionConfig>;
	groups: Record<string, ResourceV2GroupDefinitionConfig>;
	globalActionCost: SessionResourceGlobalCostReference | null;
}

function resolveOrder(value: { order?: number }): number {
	return value.order ?? 0;
}

function ensureDescriptorId(
	id: string,
	descriptor: SessionResourceValueDescriptor,
): SessionResourceValueDescriptor {
	if (descriptor.id) {
		return descriptor;
	}
	return Object.freeze({ ...descriptor, id });
}

export function freezeResourceMetadataByOrder<T>(
	values: Iterable<T>,
	selectOrder: (value: T) => number,
): readonly T[] {
	const decorated = Array.from(values, (value, index) => ({
		value,
		order: selectOrder(value),
		index,
	}));
	decorated.sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return left.index - right.index;
	});
	return Object.freeze(decorated.map((entry) => entry.value));
}

export function buildSessionResourceGroupPresentations(
	descriptors: Record<string, SessionResourceValueDescriptor> = {},
	groups: Iterable<SessionResourceGroupDescriptor> = [],
): readonly SessionResourceGroupPresentation[] {
	const descriptorMap = new Map<string, SessionResourceValueDescriptor>();
	for (const [id, descriptor] of Object.entries(descriptors)) {
		descriptorMap.set(id, ensureDescriptorId(id, descriptor));
	}

	const presentations: SessionResourceGroupPresentation[] = [];

	for (const group of groups) {
		const parentOrder = resolveOrder(group.parent);
		const parent: SessionResourceGroupParentDescriptor & { order: number } =
			Object.freeze({
				...group.parent,
				order: parentOrder,
			});

		const childDescriptors: SessionResourceValueDescriptor[] = [];
		for (const childId of group.children ?? []) {
			const descriptor = descriptorMap.get(childId);
			if (!descriptor) {
				continue;
			}
			childDescriptors.push(ensureDescriptorId(childId, descriptor));
		}

		const orderedChildren = freezeResourceMetadataByOrder(
			childDescriptors,
			(descriptor) => resolveOrder(descriptor),
		);

		presentations.push({
			groupId: group.groupId,
			parent,
			children: orderedChildren,
		});
	}

	return freezeResourceMetadataByOrder(presentations, (presentation) =>
		resolveOrder(presentation.parent),
	);
}

export function deriveOrderedSessionResourceValues(
	descriptors: Record<string, SessionResourceValueDescriptor> = {},
	groups: Iterable<SessionResourceGroupDescriptor> = [],
): readonly SessionResourceOrderedValueEntry[] {
	const descriptorMap = new Map<string, SessionResourceValueDescriptor>();
	for (const [id, descriptor] of Object.entries(descriptors)) {
		descriptorMap.set(id, ensureDescriptorId(id, descriptor));
	}

	const groupArray = Array.from(groups);
	const groupedChildIds = new Set<string>();
	for (const group of groupArray) {
		for (const childId of group.children ?? []) {
			groupedChildIds.add(childId);
		}
	}

	const standaloneDescriptors = freezeResourceMetadataByOrder(
		Array.from(descriptorMap.entries())
			.filter(([id]) => !groupedChildIds.has(id))
			.map(([id, descriptor]) => ensureDescriptorId(id, descriptor)),
		(descriptor) => resolveOrder(descriptor),
	);

	const presentations = buildSessionResourceGroupPresentations(
		Object.fromEntries(
			Array.from(descriptorMap.entries(), ([id, descriptor]) => [
				id,
				descriptor,
			]),
		),
		groupArray,
	);

	const blocks: {
		order: number;
		entries: SessionResourceOrderedValueEntry[];
	}[] = [];

	for (const descriptor of standaloneDescriptors) {
		blocks.push({
			order: resolveOrder(descriptor),
			entries: [
				{
					kind: 'value',
					descriptor,
				},
			],
		});
	}

	for (const group of presentations) {
		const entries: SessionResourceOrderedValueEntry[] = [
			{
				kind: 'group-parent',
				groupId: group.groupId,
				parent: group.parent,
			},
		];
		for (const child of group.children) {
			entries.push({
				kind: 'value',
				descriptor: child,
				groupId: group.groupId,
			});
		}
		blocks.push({
			order: resolveOrder(group.parent),
			entries,
		});
	}

	const orderedBlocks = freezeResourceMetadataByOrder(
		blocks,
		(block) => block.order,
	);
	return Object.freeze(orderedBlocks.flatMap((block) => block.entries));
}
