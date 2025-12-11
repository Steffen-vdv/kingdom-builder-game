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

import { ResourceId } from '../constants';

// All resource IDs are unified under a single constant
export const Resource = ResourceId;
export type ResourceKey = (typeof Resource)[keyof typeof Resource];
export type ResourceId = ResourceKey;

// Helper for getting resource ID (identity function for type narrowing)
export function getResourceId(resource: ResourceKey): ResourceKey {
	return resource;
}

export { resourceAddEffect } from './resourceEffects';
