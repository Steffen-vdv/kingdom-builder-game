import { useMemo, useRef } from 'react';
import {
	simulateUpcomingPhases,
	type PlayerSnapshotDeltaBucket,
	type PlayerStateSnapshot,
} from '@kingdom-builder/engine';
import { useGameEngine } from './GameContext';

export type NextTurnForecast = Record<string, PlayerSnapshotDeltaBucket>;

function cloneEmptyDelta(): PlayerSnapshotDeltaBucket {
	return {
		resources: {},
		stats: {},
		population: {},
	};
}

function serializeRecord(source: Record<string, unknown>): string {
	const entries = Object.entries(source).sort(([a], [b]) => {
		if (a < b) {
			return -1;
		}
		if (a > b) {
			return 1;
		}
		return 0;
	});
	return JSON.stringify(entries);
}

function hashPlayer(player: PlayerStateSnapshot): string {
	return [
		player.id,
		serializeRecord(player.resources),
		serializeRecord(player.stats),
		serializeRecord(player.population),
		player.lands.length,
		serializeRecord(player.skipPhases),
		serializeRecord(player.skipSteps),
	].join('|');
}

export function useNextTurnForecast(): NextTurnForecast {
	const { session, sessionState } = useGameEngine();
	const players = sessionState.game.players;
	const hashKey = useMemo(() => {
		const hashes = players.map((player) => hashPlayer(player));
		hashes.sort();
		return hashes.join(',');
	}, [players]);
	const cacheRef = useRef<{ key: string; value: NextTurnForecast }>();
	return useMemo(() => {
		if (cacheRef.current?.key === hashKey) {
			return cacheRef.current.value;
		}
		const context = session.getLegacyContext();
		const forecast: NextTurnForecast = {};
		for (const player of players) {
			try {
				const { delta } = simulateUpcomingPhases(context, player.id);
				forecast[player.id] = delta;
			} catch (error) {
				forecast[player.id] = cloneEmptyDelta();
			}
		}
		cacheRef.current = { key: hashKey, value: forecast };
		return forecast;
	}, [session, hashKey]);
}
