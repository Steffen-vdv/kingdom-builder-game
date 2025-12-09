import type { ActionConfig } from '@kingdom-builder/protocol';

/**
 * Extracts the target building ID from an action's effects.
 * Returns the building ID if the action has a `building:add` effect,
 * otherwise returns undefined.
 */
export function extractBuildingIdFromAction(
	actionConfig: ActionConfig | undefined,
): string | undefined {
	if (!actionConfig?.effects) {
		return undefined;
	}
	for (const effect of actionConfig.effects) {
		// Skip effect groups (they have 'options' instead of 'type')
		if ('options' in effect) {
			continue;
		}
		if (effect.type === 'building' && effect.method === 'add') {
			const buildingId = effect.params?.['id'];
			if (typeof buildingId === 'string') {
				return buildingId;
			}
		}
	}
	return undefined;
}

/**
 * Checks if a building purchase action should be disabled because
 * the player already owns the target building.
 */
export function isBuildingAlreadyOwned(
	actionConfig: ActionConfig | undefined,
	playerBuildings: Set<string>,
): boolean {
	const buildingId = extractBuildingIdFromAction(actionConfig);
	if (!buildingId) {
		return false;
	}
	return playerBuildings.has(buildingId);
}
