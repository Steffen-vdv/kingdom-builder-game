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
		if (actionDefinition.system) {
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
