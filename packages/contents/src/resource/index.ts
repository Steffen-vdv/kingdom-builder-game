export type {
	ResourceBoundReference,
	ResourceBoundValue,
	ResourceMetadata,
	ResourceBounds,
	ResourceGlobalCostConfig,
	ResourceTierThreshold,
	ResourceTierDefinition,
	ResourceTierTrackMetadata,
	ResourceTierTrack,
	ResourceDefinition,
	ResourceGroupParent,
	ResourceGroupDefinition,
	ResourceCategoryItem,
	ResourceCategoryDefinition,
} from './types';
export { boundTo } from './types';

export { resource } from './resourceBuilder';
export type { ResourceBuilder } from './resourceBuilder';

export { resourceGroup } from './groupBuilder';
export type { ResourceGroupBuilder } from './groupBuilder';

export { resourceCategory } from './categoryBuilder';
export type { ResourceCategoryBuilder } from './categoryBuilder';

export { createResourceRegistry, createResourceGroupRegistry, createResourceCategoryRegistry } from './registry';
export type { ResourceRegistry, ResourceGroupRegistry, ResourceCategoryRegistry } from './registry';

export { RESOURCE_REGISTRY, RESOURCE_GROUP_REGISTRY, RESOURCE_CATEGORY_REGISTRY, buildResourceCatalog } from './catalog';
export type { ResourceCatalog } from './catalog';

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
	ResourceTransferEffectParams,
	ResourceTransferEndpointPayload,
	ResourceUpperBoundIncreaseBuilder,
	ResourceUpperBoundIncreaseParams,
	ResourceValueWriteOptions,
	ResourcePlayerScope,
} from './effects';
