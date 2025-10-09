import type { Focus } from '@kingdom-builder/contents';
import type {
	ActionDefinition,
	SessionActionOption,
	SessionBuildingOption,
	SessionDevelopmentOption,
	SessionPlayerView,
} from '../../state/sessionSelectors.types';
import type { GameEngineContextValue } from '../../state/GameContext.types';
import type { Action as PerformableAction } from '../../state/actionTypes';

export interface Action
	extends SessionActionOption,
		PerformableAction,
		Partial<Pick<ActionDefinition, 'effects' | 'requirements'>> {
	system?: boolean;
	focus?: Focus;
}

export interface Development extends SessionDevelopmentOption {
	focus?: Focus;
}

export interface Building extends SessionBuildingOption {
	focus?: Focus;
}

export type DisplayPlayer = SessionPlayerView;
export type HoverCardData = Parameters<
	GameEngineContextValue['handleHoverCard']
>[0];

export const toPerformableAction = (action: Action): PerformableAction => ({
	id: action.id,
	name: action.name,
	...(typeof action.system === 'boolean' ? { system: action.system } : {}),
});
