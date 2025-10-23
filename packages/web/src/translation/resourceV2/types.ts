import type {
	SessionResourceOrderedValueEntry,
	SessionResourceTierStatus,
	SessionResourceValueDescriptor,
	SessionResourceValueMetadata,
	SessionResourceValueSnapshot,
	SessionResourceValueSnapshotMap,
} from '@kingdom-builder/protocol/session';

export interface ResourceValuesTranslationTarget {
	readonly metadata: SessionResourceValueMetadata;
	readonly values: SessionResourceValueSnapshotMap;
	readonly globalActionCost?: ResourceValuesGlobalCost | null;
}

export type ResourceValueDescriptor = SessionResourceValueDescriptor & {
	readonly id: string;
};

export type ResourceOrderedEntry = SessionResourceOrderedValueEntry;
export type ResourceValueSnapshot = SessionResourceValueSnapshot;
export type ResourceValueTierStatus = SessionResourceTierStatus;
export interface ResourceValuesGlobalCost {
	readonly resourceId: string;
	readonly amount: number;
}
