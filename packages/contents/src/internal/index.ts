/**
 * Internal content helpers for content creators only.
 *
 * These semantic constants provide convenient aliases for resource IDs.
 * They are NOT exported from the public package API and should NOT be
 * imported by external packages (engine, server, web).
 *
 * External packages should use the literal resource ID strings directly
 * (e.g., 'resource:core:gold' instead of Resource.gold).
 */

export { Resource, type ResourceKey, type ResourceId, getResourceId } from './resourceKeys';
export { Stat, type StatKey, type StatId, getStatResourceId } from './stats';
export { PopulationRole, type PopulationRoleId } from './populationRoles';
export { statAddEffect } from './statEffects';
