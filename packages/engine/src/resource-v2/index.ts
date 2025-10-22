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

export { createRuntimeResourceCatalog } from './fromContent';
export {
	initialisePlayerResourceState,
	getResourceValue,
	getResourceBounds,
	setResourceValue,
	applyResourceDelta,
	increaseLowerBound,
	increaseUpperBound,
} from './state';
export type {
	ResourceChangeContext,
	ResourceValueWriteOptions,
	ResourceValueChangeResult,
	ResourceBoundAdjustmentResult,
} from './state';
export type {
	RuntimeResourceStateDefinition,
	ResourceTierChangeResult,
} from './state.helpers';
