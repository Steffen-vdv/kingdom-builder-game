import type {
	ActionDefinition,
	SessionActionOption,
	SessionBuildingOption,
	SessionDevelopmentOption,
	SessionPlayerView,
} from '../../state/sessionSelectors.types';
import type { useGameEngine } from '../../state/GameContext';
import type { GameEngineSessionApi } from '../../state/GameContext.types';
import type { Action as PerformableAction } from '../../state/actionTypes';

export type ActionFocus = string & { __brand?: 'ActionFocus' };

export const normalizeActionFocus = (
	focus: unknown,
): ActionFocus | undefined => {
	if (typeof focus !== 'string') {
		return undefined;
	}
	const trimmed = focus.trim();
	if (trimmed.length === 0) {
		return undefined;
	}
	return trimmed as ActionFocus;
};

export interface Action
	extends SessionActionOption,
		PerformableAction,
		Partial<Pick<ActionDefinition, 'effects' | 'requirements'>> {
	system?: boolean;
	focus?: ActionFocus;
}

export interface Development extends SessionDevelopmentOption {
	focus?: ActionFocus;
}

export interface Building extends SessionBuildingOption {
	focus?: ActionFocus;
}

export type GameEngineApi = ReturnType<typeof useGameEngine>;
export type { GameEngineSessionApi };
export type DisplayPlayer = SessionPlayerView;
export type HoverCardData = Parameters<GameEngineApi['handleHoverCard']>[0];

export const toPerformableAction = (action: Action): PerformableAction => ({
	id: action.id,
	name: action.name,
	...(typeof action.system === 'boolean' ? { system: action.system } : {}),
});
