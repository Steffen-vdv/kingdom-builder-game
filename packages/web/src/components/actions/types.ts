import type {
	ActionDefinition,
	SessionActionOption,
	SessionBuildingOption,
	SessionDevelopmentOption,
	SessionPlayerView,
} from '../../state/sessionSelectors.types';
import type { useGameEngine } from '../../state/GameContext';
import type { Action as PerformableAction } from '../../state/actionTypes';

export type FocusId = string;

export interface Action
	extends SessionActionOption,
		PerformableAction,
		Partial<Pick<ActionDefinition, 'effects' | 'requirements'>> {
	system?: boolean;
	focus?: FocusId;
}

export interface Development extends SessionDevelopmentOption {
	focus?: FocusId;
}

export interface Building extends SessionBuildingOption {
	focus?: FocusId;
}

export type GameEngineApi = ReturnType<typeof useGameEngine>;
export type DisplayPlayer = SessionPlayerView;
export type HoverCardData = Parameters<GameEngineApi['handleHoverCard']>[0];

export const toPerformableAction = (action: Action): PerformableAction => ({
	id: action.id,
	name: action.name,
	...(typeof action.system === 'boolean' ? { system: action.system } : {}),
});
