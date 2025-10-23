import type {
	SessionResourceOrderedValueEntry,
	SessionResourceRecentChange,
	SessionResourceTierStatus,
	SessionResourceValueDescriptor,
	SessionResourceValueMetadata,
	SessionResourceValueSnapshot,
	SessionResourceValueSnapshotMap,
} from '@kingdom-builder/protocol/session';

export interface ResourceV2TranslationSource {
	readonly metadata: SessionResourceValueMetadata;
	readonly values: SessionResourceValueSnapshotMap;
	readonly globalActionCost?: ResourceV2GlobalActionCostHint | null;
}

export interface ResourceV2GlobalActionCostHint {
	readonly resourceId: string;
	readonly amount: number;
}

export type ResourceV2ValueDescriptor = SessionResourceValueDescriptor;
export type ResourceV2ValueSnapshot = SessionResourceValueSnapshot;
export type ResourceV2OrderedEntry = SessionResourceOrderedValueEntry;
export type ResourceV2TierStatus = SessionResourceTierStatus;
export type ResourceV2RecentChange = SessionResourceRecentChange;
