import { Resource, type ResourceKey } from './resources';

/**
 * Primary icon identifier used for branding (e.g., favicon, loading screens).
 *
 * Content designers can update this value to any defined resource key to
 * change the global icon without touching the web client.
 */
export const PRIMARY_ICON_ID: ResourceKey = Resource.castleHP;
