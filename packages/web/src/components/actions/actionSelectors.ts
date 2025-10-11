import type {
	TranslationAssets,
	TranslationContext,
} from '../../translation/context';
import type {
	SessionActionOption,
	SessionBuildingOption,
	SessionDevelopmentOption,
} from '../../state/sessionSelectors.types';
import type { Action, Building, Development, FocusId } from './types';

export interface IconLabelDisplay {
	icon?: string;
	label: string;
	description?: string;
}

export interface ActionDisplay {
	id: string;
	name: string;
	icon?: string;
	focus?: FocusId;
}

export const DEFAULT_POPULATION_FALLBACK_ICON = '👥';

export function normalizeFocus(value: unknown): FocusId | undefined {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed.length > 0) {
			const focusValue: FocusId = trimmed;
			return focusValue;
		}
	}
	return undefined;
}

export function mapActionOption(option: SessionActionOption): Action {
	const mapped: Action = {
		id: option.id,
		name: option.name,
	};
	if (option.icon !== undefined) {
		mapped.icon = option.icon;
	}
	if (option.system !== undefined) {
		mapped.system = option.system;
	}
	if (option.order !== undefined) {
		mapped.order = option.order;
	}
	if (option.category !== undefined) {
		mapped.category = option.category;
	}
	const focus = normalizeFocus(option.focus);
	if (focus !== undefined) {
		mapped.focus = focus;
	}
	return mapped;
}

export function mapDevelopmentOption(
	option: SessionDevelopmentOption,
): Development {
	const mapped: Development = {
		id: option.id,
		name: option.name,
	};
	if (option.icon !== undefined) {
		mapped.icon = option.icon;
	}
	if (option.system !== undefined) {
		mapped.system = option.system;
	}
	if (option.order !== undefined) {
		mapped.order = option.order;
	}
	if (option.upkeep !== undefined) {
		mapped.upkeep = option.upkeep;
	}
	const focus = normalizeFocus(option.focus);
	if (focus !== undefined) {
		mapped.focus = focus;
	}
	return mapped;
}

export function mapBuildingOption(option: SessionBuildingOption): Building {
	const mapped: Building = {
		id: option.id,
		name: option.name,
		costs: option.costs,
	};
	if (option.icon !== undefined) {
		mapped.icon = option.icon;
	}
	if (option.upkeep !== undefined) {
		mapped.upkeep = option.upkeep;
	}
	const focus = normalizeFocus(option.focus);
	if (focus !== undefined) {
		mapped.focus = focus;
	}
	return mapped;
}

export function resolveResourceDisplay(
	assets: TranslationAssets,
	key: string | undefined,
): IconLabelDisplay {
	if (!key) {
		return { label: 'Unknown resource' };
	}
	const entry = assets.resources[key];
	if (entry) {
		const display: IconLabelDisplay = {
			label: entry.label ?? key,
		};
		if (entry.icon !== undefined) {
			display.icon = entry.icon;
		}
		if (entry.description !== undefined) {
			display.description = entry.description;
		}
		return display;
	}
	return { label: key };
}

export function resolveSlotDisplay(
	assets: TranslationAssets,
): IconLabelDisplay {
	const { slot } = assets;
	const display: IconLabelDisplay = {
		label: slot.label ?? 'Development Slot',
	};
	if (slot.icon !== undefined) {
		display.icon = slot.icon;
	}
	if (slot.description !== undefined) {
		display.description = slot.description;
	}
	return display;
}

export function resolvePopulationDisplay(
	assets: TranslationAssets,
	roleId: string,
): IconLabelDisplay {
	const entry = assets.populations[roleId];
	if (entry) {
		const display: IconLabelDisplay = {
			label: entry.label ?? roleId,
		};
		if (entry.icon !== undefined) {
			display.icon = entry.icon;
		}
		if (entry.description !== undefined) {
			display.description = entry.description;
		}
		return display;
	}
	const fallback = assets.population;
	const display: IconLabelDisplay = {
		label: fallback.label ?? roleId,
	};
	display.icon = fallback.icon ?? DEFAULT_POPULATION_FALLBACK_ICON;
	if (fallback.description !== undefined) {
		display.description = fallback.description;
	}
	return display;
}

export function resolveActionDisplay(
	translationContext: TranslationContext,
	action: Action,
): ActionDisplay {
	const definition = translationContext.actions.has(action.id)
		? translationContext.actions.get(action.id)
		: undefined;
	const display: ActionDisplay = {
		id: action.id,
		name: action.name,
	};
	if (action.icon !== undefined) {
		display.icon = action.icon;
	}
	if (action.focus !== undefined) {
		display.focus = action.focus;
	}
	if (definition && typeof definition === 'object') {
		if ('name' in definition && typeof definition.name === 'string') {
			display.name = definition.name;
		}
		if ('icon' in definition && typeof definition.icon === 'string') {
			display.icon = definition.icon;
		}
		if ('focus' in definition) {
			const focus = normalizeFocus(
				(definition as { focus?: unknown }).focus ?? action.focus,
			);
			if (focus !== undefined) {
				display.focus = focus;
			}
		}
	}
	return display;
}
