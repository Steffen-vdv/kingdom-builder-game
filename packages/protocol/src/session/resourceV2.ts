import type {
	ResourceV2DisplayMetadataConfig,
	ResourceV2GroupDefinitionConfig,
	ResourceV2GroupMetadataConfig,
	ResourceV2GroupParentConfig,
	ResourceV2TierStepConfig,
	ResourceV2TierTrackConfig,
} from '../resourceV2/definitions';

export interface SessionResourceValueSnapshotBounds {
	readonly lowerBound?: number;
	readonly upperBound?: number;
}

export interface SessionResourceValueSnapshot
	extends SessionResourceValueSnapshotBounds {
	readonly id: string;
	readonly current: number;
	readonly touched: boolean;
	readonly trackValueBreakdown?: boolean;
	readonly trackBoundBreakdown?: boolean;
}

export type SessionResourceValueSnapshotMap = Record<
	string,
	SessionResourceValueSnapshot
>;

export interface SessionResourceValueDelta
	extends SessionResourceValueSnapshotBounds {
	readonly value: number;
}

export type SessionResourceValueDeltaMap = Record<
	string,
	SessionResourceValueDelta
>;

export interface SessionResourceGlobalCostReference {
	readonly resourceId: string;
	readonly amount: number;
}

export interface SessionResourceValueDescriptor
	extends Omit<ResourceV2DisplayMetadataConfig, 'order'> {
	readonly id: string;
	readonly order: number;
	readonly groupId?: string;
	readonly groupOrder?: number;
	readonly parentId?: string;
	readonly limitedParent?: boolean;
	readonly globalActionCost?: SessionResourceGlobalCostReference;
}

export type SessionResourceValueDescriptorRecord = Record<
	string,
	SessionResourceValueDescriptor
>;

export interface SessionResourceGroupParentDescriptor
	extends Omit<ResourceV2GroupParentConfig, 'limited'> {
	readonly limited: true;
}

export interface SessionResourceGroupDescriptor {
	readonly id: string;
	readonly order: number;
	readonly parentId: string;
	readonly parent: SessionResourceGroupParentDescriptor;
	readonly children: readonly string[];
}

export type SessionResourceGroupDescriptorRecord = Record<
	string,
	SessionResourceGroupDescriptor
>;

export interface SessionResourceTierStepDescriptor
	extends Pick<ResourceV2TierStepConfig, 'id' | 'min' | 'max'> {
	readonly index: number;
	readonly display?: ResourceV2TierStepConfig['display'];
}

export interface SessionResourceTierTrackDescriptor
	extends Pick<ResourceV2TierTrackConfig, 'id'> {
	readonly display?: ResourceV2TierTrackConfig['display'];
	readonly steps: readonly SessionResourceTierStepDescriptor[];
}

export interface SessionResourceTierStatus {
	readonly track: SessionResourceTierTrackDescriptor;
	readonly currentStepId: string | null;
	readonly currentStepIndex: number | null;
}

export type SessionResourceTierStatusRecord = Record<
	string,
	SessionResourceTierStatus
>;

export interface SessionResourceValueMetadata {
	readonly descriptors: SessionResourceValueDescriptorRecord;
	readonly groups: SessionResourceGroupDescriptorRecord;
	readonly tiers?: SessionResourceTierStatusRecord;
	readonly globalActionCost?: SessionResourceGlobalCostReference | null;
}

export interface SessionResourceRecentGain {
	readonly resourceId: string;
	readonly amount: number;
}

export interface SessionResourceDisplayValue {
	readonly id: string;
	readonly descriptor: SessionResourceValueDescriptor;
}

export interface SessionResourceDisplayGroup {
	readonly id: string;
	readonly order: number;
	readonly parent: SessionResourceGroupParentDescriptor;
	readonly values: readonly SessionResourceDisplayValue[];
}

export interface SessionResourceDisplayPlan {
	readonly groups: readonly SessionResourceDisplayGroup[];
	readonly standalone: readonly SessionResourceDisplayValue[];
}

function toDisplayValue(
	id: string,
	descriptors: SessionResourceValueDescriptorRecord,
): SessionResourceDisplayValue | null {
	const descriptor = descriptors[id];
	if (!descriptor) {
		return null;
	}
	return { id, descriptor };
}

export function createResourceDisplayPlan(
	descriptors: SessionResourceValueDescriptorRecord,
	groups: SessionResourceGroupDescriptorRecord,
): SessionResourceDisplayPlan {
	const standalone: SessionResourceDisplayValue[] = [];
	const grouped = new Map<string, SessionResourceDisplayGroup>();

	for (const descriptor of Object.values(descriptors)) {
		if (!descriptor.groupId) {
			const value = toDisplayValue(descriptor.id, descriptors);
			if (value) {
				standalone.push(value);
			}
			continue;
		}

		const group = groups[descriptor.groupId];
		if (!group) {
			const value = toDisplayValue(descriptor.id, descriptors);
			if (value) {
				standalone.push(value);
			}
			continue;
		}

		if (!grouped.has(group.id)) {
			grouped.set(group.id, {
				id: group.id,
				order: group.order,
				parent: group.parent,
				values: [],
			});
		}
		const entry = grouped.get(group.id)!;
		const value = toDisplayValue(descriptor.id, descriptors);
		if (value) {
			(entry.values as SessionResourceDisplayValue[]).push(value);
		}
	}

	standalone.sort((a, b) => a.descriptor.order - b.descriptor.order);

	const orderedGroups = Array.from(grouped.values()).map((group) => ({
		...group,
		values: [...group.values].sort(
			(a, b) => a.descriptor.groupOrder! - b.descriptor.groupOrder!,
		),
	}));

	orderedGroups.sort((a, b) => a.order - b.order);

	return {
		groups: orderedGroups,
		standalone,
	};
}

export function extractGroupChildren(
	groups: Record<string, ResourceV2GroupDefinitionConfig>,
	descriptors: SessionResourceValueDescriptorRecord,
): SessionResourceGroupDescriptorRecord {
	const result: SessionResourceGroupDescriptorRecord = {};
	for (const [id, definition] of Object.entries(groups)) {
		const children = Object.values(descriptors)
			.filter((descriptor) => descriptor.groupId === id)
			.sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0))
			.map((descriptor) => descriptor.id);

		result[id] = {
			id,
			order: definition.parent.order,
			parentId: definition.parent.id,
			parent: { ...definition.parent, limited: true },
			children,
		};
	}
	return result;
}

export function createValueDescriptor(
	id: string,
	display: ResourceV2DisplayMetadataConfig,
	group?: ResourceV2GroupMetadataConfig,
): SessionResourceValueDescriptor {
	const descriptor: SessionResourceValueDescriptor = {
		id,
		icon: display.icon,
		label: display.label,
		description: display.description,
		percent: display.percent,
		order: display.order,
	};

	if (group) {
		descriptor.groupId = group.groupId;
		descriptor.groupOrder = group.order;
		if (group.parent) {
			descriptor.parentId = group.parent.id;
			descriptor.limitedParent = true;
		}
	}

	return descriptor;
}
