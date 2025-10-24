export type {
	RuntimeResourceTierThreshold,
	RuntimeResourceTierDefinition,
	RuntimeResourceTierTrackMetadata,
	RuntimeResourceTierTrack,
	RuntimeResourceMetadata,
	RuntimeResourceBounds,
	RuntimeResourceGlobalCostConfig,
	RuntimeResourceDefinition,
	RuntimeResourceGroupParent,
	RuntimeResourceGroup,
	RuntimeResourceRegistry,
	RuntimeResourceGroupRegistry,
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
	resourceV2Transfer,
	resourceV2IncreaseUpperBound,
} from './effects/transfer';

export type {
	ResourceV2ValueWriteOptions,
	ResourceV2TransferEndpointPayload,
	ResourceV2TransferEffectParams,
	ResourceV2UpperBoundIncreaseParams,
	ResourceV2PlayerScope,
} from './effects/transfer';
