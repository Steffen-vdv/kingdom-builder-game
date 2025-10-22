export interface SessionResourceV2ValueSnapshot {
	/**
	 * Current value tracked for the resource.
	 */
	value: number;
	/**
	 * Configured lower bound when provided by the definition.
	 */
	lowerBound?: number;
	/**
	 * Configured upper bound when provided by the definition.
	 */
	upperBound?: number;
	/**
	 * Indicates whether the value changed during the latest evaluation window.
	 */
	touched?: boolean;
}

export type SessionResourceV2ValueMap = Record<
	string,
	SessionResourceV2ValueSnapshot
>;

export interface SessionResourceV2RecentValueDelta {
	resourceId: string;
	amount: number;
}

export interface SessionResourceV2ValueDescriptor {
	id: string;
	key: string;
	icon?: string;
	label?: string;
	description?: string;
	order: number;
	percent?: boolean;
	tags?: readonly string[];
	groupId?: string;
}

export interface SessionResourceV2GroupParentDescriptor {
	id: string;
	icon?: string;
	label?: string;
	description?: string;
	order: number;
	limited: true;
}

export interface SessionResourceV2GroupDescriptor {
	id: string;
	parent: SessionResourceV2GroupParentDescriptor;
	children: readonly string[];
	order: number;
}

export type SessionResourceV2OrderedValueEntry =
	| { kind: 'resource'; resourceId: string }
	| { kind: 'group-parent'; groupId: string; parentId: string };

export interface SessionResourceV2TierStepStatus {
	id: string;
	entered: boolean;
	active: boolean;
}

export interface SessionResourceV2TierStatus {
	trackId: string;
	currentStepId: string | null;
	steps: readonly SessionResourceV2TierStepStatus[];
}

export interface SessionResourceV2ValueMetadata {
	descriptors?: Record<string, SessionResourceV2ValueDescriptor>;
	groups?: Record<string, SessionResourceV2GroupDescriptor>;
	ordered?: readonly SessionResourceV2OrderedValueEntry[];
	tiers?: Record<string, SessionResourceV2TierStatus>;
}

export interface SessionResourceV2GlobalActionCostReference {
	resourceId: string;
	amount: number;
}
export function buildOrderedResourceV2DisplayEntries(
	descriptors: Record<string, SessionResourceV2ValueDescriptor>,
	groups?: Record<string, SessionResourceV2GroupDescriptor>,
): readonly SessionResourceV2OrderedValueEntry[] {
	const blocks: {
		order: number;
		entries: SessionResourceV2OrderedValueEntry[];
		index: number;
	}[] = [];
	const groupedIds = new Set<string>();

	if (groups) {
		for (const group of Object.values(groups)) {
			for (const child of group.children) {
				groupedIds.add(child);
			}
		}
	}

	let blockIndex = 0;

	for (const descriptor of Object.values(descriptors)) {
		if (descriptor.groupId && groupedIds.has(descriptor.id)) {
			continue;
		}
		blocks.push({
			order: descriptor.order,
			entries: [
				{
					kind: 'resource' as const,
					resourceId: descriptor.id,
				},
			],
			index: blockIndex++,
		});
	}

	if (groups) {
		for (const group of Object.values(groups)) {
			const entries: SessionResourceV2OrderedValueEntry[] = [
				{
					kind: 'group-parent',
					groupId: group.id,
					parentId: group.parent.id,
				},
			];
			for (const child of group.children) {
				entries.push({
					kind: 'resource',
					resourceId: child,
				});
			}
			blocks.push({
				order: group.order,
				entries,
				index: blockIndex++,
			});
		}
	}

	blocks.sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return left.index - right.index;
	});

	return blocks.flatMap((block) => block.entries);
}
