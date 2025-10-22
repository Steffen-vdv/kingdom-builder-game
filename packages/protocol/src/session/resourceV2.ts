export interface SessionResourceV2ValueSnapshot {
	current: number;
	lowerBound?: number;
	upperBound?: number;
}

export type SessionResourceV2ValueSnapshotMap = Record<
	string,
	SessionResourceV2ValueSnapshot
>;

export interface SessionResourceV2RecentGain {
	resourceId: string;
	amount: number;
}

export interface SessionResourceV2ValueDescriptor {
	id: string;
	icon?: string;
	label?: string;
	description?: string;
	order: number;
	percent?: boolean;
	groupId?: string;
}

export type SessionResourceV2ValueDescriptorMap = Record<
	string,
	SessionResourceV2ValueDescriptor
>;

export interface SessionResourceV2GroupStructure {
	id: string;
	parentId: string;
	parentOrder: number;
	children: readonly string[];
}

export type SessionResourceV2GroupStructureMap = Record<
	string,
	SessionResourceV2GroupStructure
>;

export interface SessionResourceV2TierStepStatusDisplay {
	label?: string;
	summaryToken?: string;
}

export interface SessionResourceV2TierStepStatus {
	id: string;
	min: number;
	max?: number;
	display?: SessionResourceV2TierStepStatusDisplay;
}

export interface SessionResourceV2TierStatus {
	trackId: string;
	current: SessionResourceV2TierStepStatus;
	previous?: SessionResourceV2TierStepStatus;
	next?: SessionResourceV2TierStepStatus;
}

export type SessionResourceV2TierStatusMap = Record<
	string,
	SessionResourceV2TierStatus
>;

export interface SessionResourceV2GlobalCostReference {
	resourceId: string;
	amount: number;
}

export type SessionResourceV2OrderedDisplayEntry =
	| {
			kind: 'resource';
			descriptor: SessionResourceV2ValueDescriptor;
			groupId?: string;
	  }
	| {
			kind: 'group-parent';
			groupId: string;
			parent: SessionResourceV2ValueDescriptor;
	  };

export interface SessionResourceV2MetadataSnapshot {
	descriptors: SessionResourceV2ValueDescriptorMap;
	groups?: SessionResourceV2GroupStructureMap;
	ordered?: readonly SessionResourceV2OrderedDisplayEntry[];
	tiers?: SessionResourceV2TierStatusMap;
	recentGains?: readonly SessionResourceV2RecentGain[];
}

function freeze<T>(value: T): T {
	return Object.freeze(value);
}

function sortDescriptors(
	descriptors: SessionResourceV2ValueDescriptor[],
): readonly SessionResourceV2ValueDescriptor[] {
	return freeze(
		[...descriptors].sort((left, right) => {
			if (left.order !== right.order) {
				return left.order - right.order;
			}
			return left.id.localeCompare(right.id);
		}),
	);
}

export function buildResourceV2OrderedDisplay(
	descriptors: SessionResourceV2ValueDescriptorMap,
	groups?: SessionResourceV2GroupStructureMap,
): readonly SessionResourceV2OrderedDisplayEntry[] {
	const ordered: SessionResourceV2OrderedDisplayEntry[] = [];
	const handled = new Set<string>();

	const groupEntries = groups ? Object.values(groups) : [];
	groupEntries.sort((left, right) => left.parentOrder - right.parentOrder);

	for (const group of groupEntries) {
		const parentDescriptor = descriptors[group.parentId];
		if (!parentDescriptor) {
			continue;
		}

		ordered.push(
			freeze({
				kind: 'group-parent',
				groupId: group.id,
				parent: parentDescriptor,
			}) as SessionResourceV2OrderedDisplayEntry,
		);
		handled.add(group.parentId);

		const childDescriptors = sortDescriptors(
			group.children
				.map((childId) => descriptors[childId])
				.filter((descriptor): descriptor is SessionResourceV2ValueDescriptor =>
					Boolean(descriptor),
				),
		);

		for (const descriptor of childDescriptors) {
			ordered.push(
				freeze({
					kind: 'resource',
					descriptor,
					groupId: group.id,
				}) as SessionResourceV2OrderedDisplayEntry,
			);
			handled.add(descriptor.id);
		}
	}

	const remainingDescriptors = sortDescriptors(
		Object.values(descriptors).filter(
			(descriptor) => !handled.has(descriptor.id),
		),
	);

	for (const descriptor of remainingDescriptors) {
		ordered.push(
			freeze({
				kind: 'resource',
				descriptor,
			}) as SessionResourceV2OrderedDisplayEntry,
		);
	}

	return freeze(ordered);
}
