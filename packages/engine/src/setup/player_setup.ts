import type { PlayerState } from '../state';
import type {
	ActionConfig as ActionDef,
	Registry,
} from '@kingdom-builder/protocol';

export function initializePlayerActions(
	playerState: PlayerState,
	actions: Registry<ActionDef>,
): void {
	for (const [actionId, actionDefinition] of actions.entries()) {
		// System actions are engine-only, never added to player actions
		if (actionDefinition.system) {
			continue;
		}
		// Locked actions start unavailable, must be unlocked via action:add
		if (actionDefinition.locked) {
			continue;
		}
		const id = actionDefinition.id ?? actionId;
		if (!id) {
			continue;
		}
		playerState.actions.add(id);
	}
}

export type { ActionCostConfiguration } from './action_cost_resolver';
export { determineCommonActionCostResource } from './action_cost_resolver';
