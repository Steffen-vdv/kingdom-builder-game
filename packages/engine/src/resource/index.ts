export type {
	RuntimeResourceTierThreshold,
	RuntimeResourceTierDefinition,
	RuntimeResourceTierTrackMetadata,
	RuntimeResourceTierTrack,
	RuntimeResourceMetadata,
	RuntimeReconciliationMode,
	RuntimeBoundReference,
	RuntimeBoundValue,
	RuntimeResourceBounds,
	RuntimeResourceGlobalCostConfig,
	RuntimeResourceTriggers,
	RuntimeResourceSection,
	RuntimeResourceDefinition,
	RuntimeResourceGroupParent,
	RuntimeResourceGroup,
	RuntimeResourceRegistry,
	RuntimeResourceGroupRegistry,
	RuntimeResourceCategoryItem,
	RuntimeResourceCategoryDefinition,
	RuntimeResourceCategoryRegistry,
	RuntimeResourceCatalog,
} from './types';

export type {
	ResourceReconciliationMode,
	ResourceChangeRoundingMode,
	ResourceAmountChangeParameters,
	ResourcePercentChangeParameters,
	ResourceChangeParameters,
	ComputeResourceDeltaInput,
	ResourceReconciliationInput,
	ResourceReconciliationResult,
} from './reconciliation';

export {
	computeRequestedResourceDelta,
	reconcileResourceChange,
} from './reconciliation';

export { createRuntimeResourceCatalog } from './fromContent';
export type { RuntimeResourceContent } from './fromContent';

export {
	initialisePlayerResourceState,
	getResourceValue,
	setResourceValue,
	recalculateGroupParentValue,
	increaseResourceLowerBound,
	increaseResourceUpperBound,
} from './state';

export {
	getCatalogIndexes,
	resolveResourceDefinition,
	isBoundReference,
	resolveBoundValue,
	clampToBounds,
	assertInteger,
	clearRecord,
	ensureBoundFlags,
	resolveTierId,
	writeInitialState,
	aggregateChildValues,
} from './state-helpers';

export type { CatalogIndexes, ResourceDefinitionLike } from './state-helpers';

export {
	resourceTransfer,
	resourceIncreaseUpperBound,
} from './effects/transfer';

export type {
	ResourceValueWriteOptions,
	ResourceTransferEndpointPayload,
	ResourceTransferEffectParams,
	ResourceUpperBoundIncreaseParams,
	ResourcePlayerScope,
} from './effects/transfer';
