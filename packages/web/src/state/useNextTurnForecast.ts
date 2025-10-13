import { useMemo } from 'react';
import type { PlayerSnapshotDeltaBucket } from '@kingdom-builder/protocol';
import { useGameEngine } from './GameContext';

export type NextTurnForecast = Record<string, PlayerSnapshotDeltaBucket>;

function createEmptyDelta(): PlayerSnapshotDeltaBucket {
	return {
		resources: {},
		stats: {},
		population: {},
	};
}

export function useNextTurnForecast(): NextTurnForecast {
	const { sessionState } = useGameEngine();
	const players = sessionState.game.players;
	return useMemo(() => {
		const forecast: NextTurnForecast = {};
		for (const player of players) {
			forecast[player.id] = createEmptyDelta();
		}
		return forecast;
	}, [players]);
}
