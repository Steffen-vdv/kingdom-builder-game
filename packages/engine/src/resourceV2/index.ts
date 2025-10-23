export {
	createResourceV2Metadata,
	createResourceV2StateBlueprint,
} from './metadata';
export type {
	ResourceV2Metadata,
	ResourceV2MetadataSource,
	ResourceV2GlobalActionCostPointer,
	ResourceV2StateValueDefinition,
	ResourceV2StateChildDefinition,
	ResourceV2StateParentDefinition,
	ResourceV2StateBlueprint,
} from './metadata';
export {
	createResourceV2State,
	getResourceValue,
	getResourceValueState,
	isResourceTouched,
	markResourceUntouched,
	clearResourceTouches,
	clearResourceTierTouches,
	clearRecentTierTransitions,
	setResourceValue,
	adjustResourceValue,
	isLimitedResource,
} from './state';
export type {
	InitializeResourceV2StateOptions,
	ResourceV2MutableChildState,
	ResourceV2MutableParentState,
	ResourceV2MutableStateValue,
	ResourceV2MutableValueState,
	ResourceV2State,
	ResourceV2TierProgressState,
	ResourceV2TierState,
	ResourceV2TierStepState,
	ResourceV2RecentTierTransition,
	ResourceV2ValueBoundsState,
	ResourceV2ValueState,
} from './state';
