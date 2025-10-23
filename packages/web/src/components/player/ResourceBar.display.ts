import type { DescriptorDisplay } from './registryDisplays';

export interface DescriptorFormatters {
	formatValue: (value: number) => string;
	formatDelta: (delta: number) => string;
}

export interface ResourceGroupEntryDisplay {
	descriptor: DescriptorDisplay;
	parentDescriptor?: DescriptorDisplay;
	children: DescriptorDisplay[];
}

export type ResourceDisplayEntry =
	| { type: 'resource'; descriptor: DescriptorDisplay }
	| { type: 'group'; group: ResourceGroupEntryDisplay };

export interface ParentHoverInfo {
	parent: DescriptorDisplay;
	group: DescriptorDisplay;
	children: DescriptorDisplay[];
}

export const formatNumericValue = (value: number): string => {
	if (!Number.isFinite(value)) {
		return '0';
	}
	if (Number.isInteger(value)) {
		return value.toString();
	}
	return value.toLocaleString(undefined, {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0,
	});
};

const createDescriptorFormatters = (
	descriptor: DescriptorDisplay,
): DescriptorFormatters => {
	const showPercent = Boolean(
		descriptor.isPercent ?? descriptor.displayAsPercent,
	);
	const suffix = showPercent ? '%' : '';
	return {
		formatValue(value: number) {
			return `${formatNumericValue(value)}${suffix}`;
		},
		formatDelta(delta: number) {
			const absolute = formatNumericValue(Math.abs(delta));
			const prefix = delta >= 0 ? '+' : '-';
			return `${prefix}${absolute}${suffix}`;
		},
	} satisfies DescriptorFormatters;
};

export const buildDescriptorFormatters = (
	resourceDescriptors: DescriptorDisplay[],
	resourceGroupParentDescriptors: DescriptorDisplay[],
): Map<string, DescriptorFormatters> => {
	const entries = new Map<string, DescriptorFormatters>();
	for (const descriptor of resourceDescriptors) {
		entries.set(descriptor.id, createDescriptorFormatters(descriptor));
	}
	for (const parentDescriptor of resourceGroupParentDescriptors) {
		if (!entries.has(parentDescriptor.id)) {
			entries.set(
				parentDescriptor.id,
				createDescriptorFormatters(parentDescriptor),
			);
		}
	}
	return entries;
};

interface BuildResourceDisplayEntriesParams {
	resourceDescriptors: DescriptorDisplay[];
	resourceGroupDescriptors: DescriptorDisplay[];
	resourceGroupParentDescriptors: DescriptorDisplay[];
	resourceParentMap: Record<string, string | undefined>;
}

export const buildResourceDisplayEntries = ({
	resourceDescriptors,
	resourceGroupDescriptors,
	resourceGroupParentDescriptors,
	resourceParentMap,
}: BuildResourceDisplayEntriesParams): {
	entries: ResourceDisplayEntry[];
	parentInfo: Map<string, ParentHoverInfo>;
} => {
	const groupDescriptorMap = new Map(
		resourceGroupDescriptors.map((descriptor) => [descriptor.id, descriptor]),
	);
	const parentDescriptorMap = new Map(
		resourceGroupParentDescriptors.map((descriptor) => [
			descriptor.id,
			descriptor,
		]),
	);
	const entries: ResourceDisplayEntry[] = [];
	const groups = new Map<string, ResourceGroupEntryDisplay>();

	const ensureGroupEntry = (
		groupId: string,
	): ResourceGroupEntryDisplay | undefined => {
		const descriptor = groupDescriptorMap.get(groupId);
		if (!descriptor) {
			return undefined;
		}
		let entry = groups.get(groupId);
		if (!entry) {
			entry = {
				descriptor,
				children: [],
			} satisfies ResourceGroupEntryDisplay;
			groups.set(groupId, entry);
			entries.push({ type: 'group', group: entry });
		}
		return entry;
	};

	for (const descriptor of resourceDescriptors) {
		const groupId = descriptor.groupId;
		if (groupId) {
			const groupEntry = ensureGroupEntry(groupId);
			if (groupEntry) {
				groupEntry.children.push(descriptor);
				const parentIdCandidate =
					descriptor.parentId ??
					resourceParentMap[descriptor.id] ??
					groupDescriptorMap.get(groupId)?.parentId;
				if (parentIdCandidate && !groupEntry.parentDescriptor) {
					const parentDescriptor = parentDescriptorMap.get(parentIdCandidate);
					if (parentDescriptor) {
						groupEntry.parentDescriptor = parentDescriptor;
					}
				}
			} else {
				entries.push({ type: 'resource', descriptor });
			}
		} else {
			entries.push({ type: 'resource', descriptor });
		}
	}

	for (const groupEntry of groups.values()) {
		const groupDescriptor = groupEntry.descriptor;
		const expectedOrder = groupDescriptor.children;
		if (expectedOrder && expectedOrder.length > 0) {
			const childMap = new Map(
				groupEntry.children.map((child) => [child.id, child]),
			);
			const orderedChildren: DescriptorDisplay[] = [];
			for (const childId of expectedOrder) {
				const child = childMap.get(childId);
				if (child) {
					orderedChildren.push(child);
					childMap.delete(childId);
				}
			}
			if (childMap.size > 0) {
				orderedChildren.push(...childMap.values());
			}
			groupEntry.children = orderedChildren;
		}
		if (!groupEntry.parentDescriptor) {
			const fallbackParentId =
				groupDescriptor.parentId ||
				groupEntry.children.find((child) => child.parentId)?.parentId;
			if (fallbackParentId) {
				const parentDescriptor = parentDescriptorMap.get(fallbackParentId);
				if (parentDescriptor) {
					groupEntry.parentDescriptor = parentDescriptor;
				}
			}
		}
	}

	const parentHoverInfo = new Map<string, ParentHoverInfo>();
	for (const groupEntry of groups.values()) {
		if (groupEntry.parentDescriptor) {
			parentHoverInfo.set(groupEntry.parentDescriptor.id, {
				parent: groupEntry.parentDescriptor,
				group: groupEntry.descriptor,
				children: groupEntry.children,
			});
		}
	}

	return { entries, parentInfo: parentHoverInfo };
};
