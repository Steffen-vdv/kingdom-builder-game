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

export function getActionEffectGroups(
	actionId: string,
	engineContext: EngineContext,
): ActionEffectGroup[] {
	let definition: { effects: ActionEffect[] } | undefined;
	try {
		definition = engineContext.actions.get(actionId);
	} catch (error) {
		throw new Error(`Unknown action "${actionId}"`, { cause: error });
	}
	if (!definition) {
		throw new Error(`Unknown action "${actionId}"`);
	}
	const groups: ActionEffectGroup[] = [];
	for (const effect of definition.effects) {
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
