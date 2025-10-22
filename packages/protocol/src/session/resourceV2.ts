export interface SessionResourceV2ValueSnapshot {
	current: number;
	lowerBound?: number;
	upperBound?: number;
	touched?: boolean;
}

export type SessionResourceV2ValueSnapshotMap = Record<
	string,
	SessionResourceV2ValueSnapshot
>;

export interface SessionResourceV2ValueDescriptor {
	label?: string;
	icon?: string;
	description?: string;
	order: number;
	percent?: boolean;
}

export interface SessionResourceV2GroupParentDescriptor
	extends SessionResourceV2ValueDescriptor {
	id: string;
	limited: true;
}

export interface SessionResourceV2GroupPresentation {
	groupId: string;
	parent: SessionResourceV2GroupParentDescriptor;
	children: readonly string[];
}

export interface SessionResourceV2TierStepStatusDisplay {
	label?: string;
	summaryToken?: string;
}

export interface SessionResourceV2TierStepStatus {
	id: string;
	min: number;
	max?: number;
	display?: SessionResourceV2TierStepStatusDisplay;
	active: boolean;
}

export interface SessionResourceV2TierTrackDisplay {
	title?: string;
	summaryToken?: string;
}

export interface SessionResourceV2TierStatus {
	trackId: string;
	activeStepId?: string;
	display?: SessionResourceV2TierTrackDisplay;
	steps: readonly SessionResourceV2TierStepStatus[];
}

export interface SessionResourceV2ValueMetadata {
	descriptor: SessionResourceV2ValueDescriptor;
	groupId?: string;
	tier?: SessionResourceV2TierStatus;
}

export type SessionResourceV2MetadataMap = Record<
	string,
	SessionResourceV2ValueMetadata
>;

export interface SessionResourceV2MetadataSnapshot {
	descriptors: SessionResourceV2MetadataMap;
	groups?: readonly SessionResourceV2GroupPresentation[];
	orderedValues?: readonly SessionResourceV2OrderedValueEntry[];
}

export interface SessionResourceV2RecentValueChange {
	resourceId: string;
	amount: number;
}

export interface SessionResourceV2ValueEntry {
	kind: 'value';
	resourceId: string;
	descriptor: SessionResourceV2ValueDescriptor;
}

export interface SessionResourceV2GroupParentEntry {
	kind: 'group-parent';
	resourceId: string;
	groupId: string;
	descriptor: SessionResourceV2GroupParentDescriptor;
	children: readonly string[];
}

export type SessionResourceV2OrderedValueEntry =
	| SessionResourceV2ValueEntry
	| SessionResourceV2GroupParentEntry;

export interface SessionResourceV2OrderedValueBlock {
	order: number;
	entries: readonly SessionResourceV2OrderedValueEntry[];
}

export function createResourceV2ValueEntry(
	resourceId: string,
	descriptor: SessionResourceV2ValueDescriptor,
): SessionResourceV2ValueEntry {
	return { kind: 'value', resourceId, descriptor };
}

export function createResourceV2GroupParentEntry(
	groupId: string,
	parent: SessionResourceV2GroupParentDescriptor,
	children: readonly string[] = [],
): SessionResourceV2GroupParentEntry {
	return {
		kind: 'group-parent',
		resourceId: parent.id,
		groupId,
		descriptor: parent,
		children,
	};
}

export function isResourceV2GroupParentEntry(
	entry: SessionResourceV2OrderedValueEntry,
): entry is SessionResourceV2GroupParentEntry {
	return entry.kind === 'group-parent';
}

export function flattenResourceV2OrderedBlocks(
	blocks: readonly SessionResourceV2OrderedValueBlock[],
): readonly SessionResourceV2OrderedValueEntry[] {
	const ordered = [...blocks].sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return 0;
	});

	return ordered.flatMap((block) => block.entries);
}
