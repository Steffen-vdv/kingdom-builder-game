import type {
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import { deepClone } from './player_snapshot';

function cloneOption(option: ActionEffectGroupOption): ActionEffectGroupOption {
	const cloned: ActionEffectGroupOption = { ...option };
	if (option.params) {
		cloned.params = deepClone(option.params);
	}
	if (option.summary !== undefined) {
		cloned.summary = deepClone(option.summary);
	}
	if (option.description !== undefined) {
		cloned.description = deepClone(option.description);
	}
	if (option.icon && typeof option.icon === 'object') {
		cloned.icon = deepClone(option.icon);
	}
	return cloned;
}

export function cloneActionOptions(
	groups: ActionEffectGroup[],
): ActionEffectGroup[] {
	return groups.map((group) => ({
		...group,
		options: group.options.map((option) => cloneOption(option)),
	}));
}
