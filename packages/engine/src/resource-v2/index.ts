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
	createResourceStateIndex,
	initialisePlayerResourceState,
	getResourceValue,
	setResourceValue,
	applyResourceDelta,
	adjustResourceBound,
} from './state';
export type {
	ResourceStateIndex,
	ResourceStateIndexEntry,
	ResourceStateIndexEntryKind,
	ResourceValueUpdateResult,
	SetResourceValueOptions,
	ApplyResourceDeltaOptions,
	AdjustResourceBoundOptions,
	ResourceBoundAdjustmentResult,
} from './state';
