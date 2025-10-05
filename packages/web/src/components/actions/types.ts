import type { Focus, PopulationRoleId } from '@kingdom-builder/contents';
import type { useGameEngine } from '../../state/GameContext';

export interface Action {
	id: string;
	name: string;
	system?: boolean;
	order?: number;
	category?: string;
	focus?: Focus;
	requirements?: unknown[];
	effects?: unknown[];
}

export interface Development {
	id: string;
	name: string;
	system?: boolean;
	order?: number;
	focus?: Focus;
}

export interface Building {
	id: string;
	name: string;
	icon?: string;
	focus?: Focus;
}

export type GameEngineApi = ReturnType<typeof useGameEngine>;
export type DisplayPlayer = GameEngineApi['ctx']['activePlayer'];
export type HoverCardData = Parameters<GameEngineApi['handleHoverCard']>[0];
export type PopulationRegistry = Map<PopulationRoleId, unknown>;
