import { RESOURCE_REGISTRY } from './resource';

/**
 * Primary icon identifier used for branding (e.g., favicon, loading screens).
 *
 * Content designers can update this value to any defined Resource id to
 * change the global icon without touching the web client.
 */
const PRIMARY_RESOURCE_ID = 'resource:core:castle-hp' as const;

if (!RESOURCE_REGISTRY.byId[PRIMARY_RESOURCE_ID]) {
	throw new Error(`Primary icon id "${PRIMARY_RESOURCE_ID}" is not registered in the Resource catalog.`);
}

export const PRIMARY_ICON_ID = PRIMARY_RESOURCE_ID;
