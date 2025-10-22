export interface SessionResourceValueSnapshot {
	current: number;
	lowerBound?: number;
	upperBound?: number;
}

export type SessionResourceValueSnapshotMap = Record<
	string,
	SessionResourceValueSnapshot
>;

export interface SessionResourceValueDescriptor {
	id: string;
	key: string;
	order: number;
	icon?: string;
	label?: string;
	description?: string;
	percent?: boolean;
	groupId?: string;
	globalActionCost?: boolean;
}

export type SessionResourceValueDescriptorMap = Record<
	string,
	SessionResourceValueDescriptor
>;

export interface SessionResourceGroupParentDescriptor {
	id: string;
	order: number;
	icon?: string;
	label?: string;
	description?: string;
	limited: boolean;
}

export interface SessionResourceGroupDescriptor {
	id: string;
	order: number;
	parent: SessionResourceGroupParentDescriptor;
	values: string[];
}

export type SessionResourceGroupDescriptorMap = Record<
	string,
	SessionResourceGroupDescriptor
>;

export interface SessionResourceTierStepStatus {
	id: string;
	label?: string;
	summaryToken?: string;
}

export interface SessionResourceTierStatus {
	trackId: string;
	current: SessionResourceTierStepStatus;
	next?: SessionResourceTierStepStatus;
	previous?: SessionResourceTierStepStatus;
}

export type SessionResourceTierStatusMap = Record<
	string,
	SessionResourceTierStatus
>;

export interface SessionResourceRecentGain {
	valueId: string;
	key: string;
	amount: number;
}

export type SessionResourceRecentGainList = SessionResourceRecentGain[];

export interface SessionResourceValueDisplayEntry {
	id: string;
	descriptor: SessionResourceValueDescriptor;
}

export interface SessionResourceValueDisplayGroup {
	id: string;
	order: number;
	descriptors: SessionResourceValueDescriptor[];
	parent?: SessionResourceGroupParentDescriptor;
}

export interface BuildResourceValueDisplayGroupsOptions {
	descriptors: SessionResourceValueDescriptorMap;
	groups?: SessionResourceGroupDescriptorMap;
}

export const UNGROUPED_RESOURCE_VALUE_GROUP_ID = '__ungrouped__' as const;

export const sortResourceValueDescriptors = (
	descriptors: Iterable<SessionResourceValueDescriptor>,
): SessionResourceValueDescriptor[] =>
	[...descriptors].sort((left, right) => left.order - right.order);

export const buildResourceValueDisplayGroups = (
	options: BuildResourceValueDisplayGroupsOptions,
): SessionResourceValueDisplayGroup[] => {
	const { descriptors, groups = {} } = options;
	const resolvedGroups = new Map<string, SessionResourceValueDisplayGroup>();
	for (const group of Object.values(groups)) {
		resolvedGroups.set(group.id, {
			id: group.id,
			order: group.order,
			parent: group.parent,
			descriptors: [],
		});
	}

	const fallbackGroup: SessionResourceValueDisplayGroup = {
		id: UNGROUPED_RESOURCE_VALUE_GROUP_ID,
		order: Number.MAX_SAFE_INTEGER,
		descriptors: [],
	};

	let fallbackUsed = false;
	for (const descriptor of Object.values(descriptors)) {
		const candidate =
			descriptor.groupId !== undefined
				? resolvedGroups.get(descriptor.groupId)
				: undefined;
		const targetGroup = candidate ?? fallbackGroup;
		if (targetGroup === fallbackGroup) {
			fallbackUsed = true;
		}
		targetGroup.descriptors.push(descriptor);
	}

	const orderedGroups: SessionResourceValueDisplayGroup[] = [];
	for (const group of resolvedGroups.values()) {
		if (group.descriptors.length === 0) {
			continue;
		}
		group.descriptors = sortResourceValueDescriptors(group.descriptors);
		orderedGroups.push(group);
	}

	if (fallbackUsed && fallbackGroup.descriptors.length > 0) {
		fallbackGroup.descriptors = sortResourceValueDescriptors(
			fallbackGroup.descriptors,
		);
		orderedGroups.push(fallbackGroup);
	}

	return orderedGroups.sort((left, right) => {
		if (left.order === right.order) {
			return left.id.localeCompare(right.id);
		}
		return left.order - right.order;
	});
};
