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
	ResourceSection,
	ResourceDefinition,
	ResourceGroupParent,
	ResourceGroupDefinition,
	ResourceCategoryItem,
	ResourceCategoryDefinition,
} from '../infrastructure/resource/types';
export { boundTo } from '../infrastructure/resource/types';

export { resource } from '../infrastructure/resource/resourceBuilder';
export type { ResourceBuilder } from '../infrastructure/resource/resourceBuilder';

export { resourceGroup } from '../infrastructure/resource/groupBuilder';
export type { ResourceGroupBuilder } from '../infrastructure/resource/groupBuilder';

export { resourceCategory } from '../infrastructure/resource/categoryBuilder';
export type { ResourceCategoryBuilder } from '../infrastructure/resource/categoryBuilder';

export { createResourceRegistry, createResourceGroupRegistry, createResourceCategoryRegistry } from '../infrastructure/resource/registry';
export type { ResourceRegistry, ResourceGroupRegistry, ResourceCategoryRegistry } from '../infrastructure/resource/registry';

export { RESOURCE_REGISTRY, RESOURCE_GROUP_REGISTRY, RESOURCE_CATEGORY_REGISTRY, buildResourceCatalog } from '../infrastructure/resource/catalog';
export type { ResourceCatalog } from '../infrastructure/resource/catalog';

export {
	resourceChange,
	resourceTransfer,
	transferEndpoint,
	increaseUpperBound,
	ReconciliationMode,
	RoundingMode,
	VALID_RECONCILIATION_MODES,
	VALID_ROUNDING_MODES,
} from '../infrastructure/resource/effects';
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
} from '../infrastructure/resource/effects';
