import { getActionTierConfig } from '@kingdom-builder/protocol';
import { getStartingTier } from '../pool/fillAlgorithm';
import type { EngineContext } from '../context';
import type {
	ActionEffect,
	ActionEffectGroup,
} from '@kingdom-builder/protocol';

function isActionEffectGroup(
	effect: ActionEffect,
): effect is ActionEffectGroup {
	return Boolean(effect && typeof effect === 'object' && 'options' in effect);
}

/**
 * Gets the player's current tier for an action.
 * Falls back to the action's starting tier if no state exists.
 */
function getCurrentTier(
	actionId: string,
	engineContext: EngineContext,
): number {
	const actionState = engineContext.activePlayer.actionStates[actionId];
	if (actionState) {
		return actionState.currentTier;
	}
	// No state - use starting tier
	const actionDefinition = engineContext.actions.get(actionId);
	return getStartingTier(actionDefinition);
}

export function getActionEffectGroups(
	actionId: string,
	engineContext: EngineContext,
): ActionEffectGroup[] {
	let definition:
		| { id: string; tiers: Record<string, { effects: ActionEffect[] }> }
		| undefined;
	try {
		definition = engineContext.actions.get(actionId);
	} catch (error) {
		throw new Error(`Unknown action "${actionId}"`, { cause: error });
	}
	if (!definition) {
		throw new Error(`Unknown action "${actionId}"`);
	}
	const tier = getCurrentTier(actionId, engineContext);
	const tierConfig = getActionTierConfig(definition, tier);
	const groups: ActionEffectGroup[] = [];
	for (const effect of tierConfig.effects) {
		if (isActionEffectGroup(effect)) {
			groups.push(effect);
		}
	}
	return groups;
}

export {
	coerceActionEffectGroupChoices,
	resolveActionEffects,
} from '@kingdom-builder/protocol';

export type {
	ActionEffectGroup,
	ActionEffectGroupOption,
	ActionEffectGroupChoice,
	ActionEffectGroupChoiceMap,
	ResolvedActionEffectGroup,
	ResolvedActionEffectGroupOption,
	ResolvedActionEffectGroupStep,
	ResolvedActionEffectStep,
	ResolvedActionEffects,
} from '@kingdom-builder/protocol';
