import type {
	ResourceV2BoundsMetadata,
	ResourceV2Definition,
	ResourceV2DisplayMetadata,
	ResourceV2GlobalActionCostMetadata,
	ResourceV2GroupDefinition,
	ResourceV2GroupParentDescriptor,
	ResourceV2RegistryPayload,
	ResourceV2TierDefinition,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';

export type ResourceV2EntityKind = 'resource' | 'group-parent';

export interface ResourceV2EntityRecordBase<Kind extends ResourceV2EntityKind> {
	readonly id: string;
	readonly kind: Kind;
	readonly display: ResourceV2DisplayMetadata;
	readonly bounds: ResourceV2BoundsMetadata | undefined;
	readonly hasBounds: boolean;
	readonly hasLowerBound: boolean;
	readonly lowerBound: number | undefined;
	readonly hasUpperBound: boolean;
	readonly upperBound: number | undefined;
	readonly hasTierTrack: boolean;
	readonly tierTrack: ResourceV2TierTrackDefinition | undefined;
	readonly trackValueBreakdown: boolean;
	readonly trackBoundBreakdown: boolean;
}

export interface ResourceV2ResourceRecord
	extends ResourceV2EntityRecordBase<'resource'> {
	readonly definition: ResourceV2Definition;
	readonly groupId: string | undefined;
	readonly groupOrder: number | undefined;
	readonly globalActionCost: ResourceV2GlobalActionCostMetadata | undefined;
}

export interface ResourceV2GroupParentRecord
	extends ResourceV2EntityRecordBase<'group-parent'> {
	readonly descriptor: ResourceV2GroupParentDescriptor;
}

export type ResourceV2EntityRecord =
	| ResourceV2ResourceRecord
	| ResourceV2GroupParentRecord;

export interface ResourceV2GroupRecord {
	readonly id: string;
	readonly order: number;
	readonly definition: ResourceV2GroupDefinition;
	readonly parentId: string;
	readonly parent: ResourceV2GroupParentRecord;
	readonly children: ReadonlyArray<string>;
}

export interface ResourceV2RegistrySource {
	readonly resources: ReadonlyArray<ResourceV2Definition>;
	readonly groups: ReadonlyArray<ResourceV2GroupDefinition>;
}

export interface ResourceV2RegistryLoaderOptions {
	readonly resources?: ReadonlyArray<ResourceV2Definition>;
	readonly groups?: ReadonlyArray<ResourceV2GroupDefinition>;
	readonly payload?: ResourceV2RegistryPayload;
}

export type { ResourceV2TierDefinition, ResourceV2TierTrackDefinition };
