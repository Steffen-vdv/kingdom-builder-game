export type {
	ResourceV2Metadata,
	ResourceV2Bounds,
	ResourceV2GlobalCostConfig,
	ResourceV2TierThreshold,
	ResourceV2TierDefinition,
	ResourceV2TierTrackMetadata,
	ResourceV2TierTrack,
	ResourceV2Definition,
	ResourceV2GroupParent,
	ResourceV2GroupDefinition,
	ResourceCategoryItem,
	ResourceCategoryDefinition,
} from './types';

export { resourceV2 } from './resourceBuilder';
export type { ResourceV2Builder } from './resourceBuilder';

export { resourceGroup } from './groupBuilder';
export type { ResourceGroupBuilder } from './groupBuilder';

export { resourceCategory } from './categoryBuilder';
export type { ResourceCategoryBuilder } from './categoryBuilder';

export { createResourceV2Registry, createResourceGroupRegistry, createResourceCategoryRegistry } from './registry';
export type { ResourceV2Registry, ResourceGroupRegistry, ResourceCategoryRegistry } from './registry';

export { RESOURCE_V2_REGISTRY, RESOURCE_GROUP_V2_REGISTRY, RESOURCE_CATEGORY_V2_REGISTRY, buildResourceCatalogV2 } from './catalog';
export type { ResourceCatalogV2 } from './catalog';

export { resourceChange, resourceTransfer, transferEndpoint, increaseUpperBound, ReconciliationMode, RoundingMode, VALID_RECONCILIATION_MODES, VALID_ROUNDING_MODES } from './effects';
export type {
	ResourceChangeBuilder,
	ResourceChangeEffectParams,
	ResourceChangeParameters,
	ResourceAmountChangeParameters,
	ResourcePercentChangeParameters,
	ResourceChangeRoundingMode,
	ResourceReconciliationMode,
	ResourceTransferBuilder,
	ResourceTransferEndpointBuilder,
	ResourceV2TransferEffectParams,
	ResourceV2TransferEndpointPayload,
	ResourceUpperBoundIncreaseBuilder,
	ResourceV2UpperBoundIncreaseParams,
	ResourceV2ValueWriteOptions,
	ResourceV2PlayerScope,
} from './effects';
