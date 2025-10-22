import { Resource, type ResourceKey } from './resources';
import type { ResourceV2DefinitionRegistryArtifacts, ResourceV2GroupRegistryArtifacts } from './resourceV2';
import { RESOURCE_V2_DEFINITION_ARTIFACTS, RESOURCE_V2_GROUP_ARTIFACTS } from './resourceV2';

/**
 * Primary icon identifier used for branding (e.g., favicon, loading screens).
 *
 * Content designers can update this value to any defined resource key to
 * change the global icon without touching the web client.
 */
export const PRIMARY_ICON_ID: ResourceKey = Resource.castleHP;

export interface ResourceV2StartupMetadata {
	readonly definitions: ResourceV2DefinitionRegistryArtifacts;
	readonly groups: ResourceV2GroupRegistryArtifacts;
}

export const RESOURCE_V2_STARTUP_METADATA: ResourceV2StartupMetadata = {
	definitions: RESOURCE_V2_DEFINITION_ARTIFACTS,
	groups: RESOURCE_V2_GROUP_ARTIFACTS,
};
