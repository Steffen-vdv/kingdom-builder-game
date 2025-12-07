/**
 * Internal content helpers for content creators only.
 *
 * These semantic constants provide convenient aliases for V2 resource IDs.
 * They are NOT exported from the public package API and should NOT be
 * imported by external packages (engine, server, web).
 *
 * External packages should use the literal V2 resource ID strings directly
 * (e.g., 'resource:core:gold' instead of Resource.gold).
 */

export { Resource, type ResourceKey, type ResourceV2Id, getResourceV2Id } from './resourceKeys';
export { Stat, type StatKey, type StatV2Id, getStatResourceV2Id } from './stats';
export { PopulationRole, type PopulationRoleId, type PopulationRoleV2Id } from './populationRoles';
