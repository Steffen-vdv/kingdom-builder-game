/**
 * Generic resource types for contents-sdk.
 *
 * These types are game-agnostic. Specific games can narrow ResourceKey
 * to their specific resource IDs in their content packages.
 */

/**
 * A resource identifier. Games should define their specific resource IDs
 * and use this as a base type.
 */
export type ResourceKey = string;

/**
 * Helper for getting resource ID (identity function for type narrowing).
 * Allows content files to maintain type safety while passing resource IDs.
 */
export function getResourceId(resource: ResourceKey): ResourceKey {
	return resource;
}
