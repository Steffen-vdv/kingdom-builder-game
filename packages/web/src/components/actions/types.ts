import type { useGameEngine } from '../../state/GameContext';

export type GameEngineApi = ReturnType<typeof useGameEngine>;
export type HoverCardData = Parameters<GameEngineApi['handleHoverCard']>[0];
