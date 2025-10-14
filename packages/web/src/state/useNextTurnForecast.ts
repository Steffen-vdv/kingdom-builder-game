import { useMemo } from 'react';
import type {
	PlayerSnapshotDeltaBucket,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import { useGameEngine } from './GameContext';

export type NextTurnForecast = Record<string, PlayerSnapshotDeltaBucket>;

function createEmptyDelta(): PlayerSnapshotDeltaBucket {
	return {
		resources: {},
		stats: {},
		population: {},
	};
}

export function computeNextTurnForecast(
	players: SessionSnapshot['game']['players'],
): NextTurnForecast {
	const forecast: NextTurnForecast = {};
	for (const player of players) {
		forecast[player.id] = createEmptyDelta();
	}
	return forecast;
}

export function useNextTurnForecast(): NextTurnForecast {
	const { sessionState } = useGameEngine();
	const players = sessionState.game.players;
	return useMemo(() => computeNextTurnForecast(players), [players]);
}
