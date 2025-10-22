import {
	ResourceV2Builder,
	ResourceV2GroupParentBuilder,
} from './resourceV2/definition';
import {
	ResourceV2TierDefinitionBuilder,
	ResourceV2TierTrackBuilder,
} from './resourceV2/tier';
import { ResourceV2GroupBuilder } from './resourceV2/group';
import {
	ResourceV2ValueDeltaBuilder,
	type ResourceV2ValueDeltaBuilderOptions,
} from './resourceV2/valueDelta';

export {
	ResourceV2DefinitionBaseBuilder,
	ResourceV2Builder,
	ResourceV2GroupParentBuilder,
} from './resourceV2/definition';
export {
	ResourceV2TierDefinitionBuilder,
	ResourceV2TierTrackBuilder,
} from './resourceV2/tier';
export { ResourceV2GroupBuilder } from './resourceV2/group';
export {
	ResourceV2ValueDeltaBuilder,
	type ResourceV2ValueDeltaBuilderOptions,
} from './resourceV2/valueDelta';

export function resourceV2(id: string) {
	return new ResourceV2Builder(id);
}

export function resourceGroup(id: string) {
	return new ResourceV2GroupBuilder(id);
}

export function resourceTier(id: string) {
	return new ResourceV2TierDefinitionBuilder(id);
}

export function resourceTierTrack(id: string) {
	return new ResourceV2TierTrackBuilder(id);
}

export function resourceGroupParent(id: string) {
	return new ResourceV2GroupParentBuilder(id);
}

export function resourceValueDelta(
	resourceId: string,
	options?: ResourceV2ValueDeltaBuilderOptions,
) {
	return new ResourceV2ValueDeltaBuilder(resourceId, options);
}
