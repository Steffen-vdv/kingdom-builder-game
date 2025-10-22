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
} from './types';

export { resourceV2 } from './resourceBuilder';
export type { ResourceV2Builder } from './resourceBuilder';

export { resourceGroup } from './groupBuilder';
export type { ResourceGroupBuilder } from './groupBuilder';

export {
	createResourceV2Registry,
	createResourceGroupRegistry,
} from './registry';
export type { ResourceV2Registry, ResourceGroupRegistry } from './registry';
