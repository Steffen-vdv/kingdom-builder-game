import { RESOURCE_V2_REGISTRY } from './resourceV2';

/**
 * Primary icon identifier used for branding (e.g., favicon, loading screens).
 *
 * Content designers can update this value to any defined ResourceV2 id to
 * change the global icon without touching the web client.
 */
const PRIMARY_RESOURCE_V2_ID = 'resource:core:castle-hp' as const;

if (!RESOURCE_V2_REGISTRY.byId[PRIMARY_RESOURCE_V2_ID]) {
	throw new Error(`Primary icon id "${PRIMARY_RESOURCE_V2_ID}" is not registered in the ResourceV2 catalog.`);
}

export const PRIMARY_ICON_ID = PRIMARY_RESOURCE_V2_ID;
