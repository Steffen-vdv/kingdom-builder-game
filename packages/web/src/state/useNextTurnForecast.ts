import { useMemo, useRef } from 'react';
import { type PlayerSnapshotDeltaBucket } from '@kingdom-builder/engine';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import { useGameEngine } from './GameContext';

export type NextTurnForecast = Record<string, PlayerSnapshotDeltaBucket>;

function cloneEmptyDelta(): PlayerSnapshotDeltaBucket {
	return {
		resources: {},
		stats: {},
		population: {},
	};
}

function stableSerialize(value: unknown): string {
	if (typeof value === 'undefined') {
		return 'null';
	}
	const seen = new WeakSet<object>();
	const json = JSON.stringify(
		value,
		function replacer(_key: string, rawValue: unknown): unknown {
			if (typeof rawValue === 'undefined') {
				return null;
			}
			if (Array.isArray(rawValue)) {
				if (seen.has(rawValue)) {
					return '[Circular]';
				}
				seen.add(rawValue);
				return rawValue.map<unknown>((item) =>
					typeof item === 'undefined' ? null : item,
				);
			}
			if (rawValue && typeof rawValue === 'object') {
				if (seen.has(rawValue)) {
					return '[Circular]';
				}
				seen.add(rawValue);
				const entries = Object.entries(rawValue as Record<string, unknown>)
					.filter(([, entryValue]) => typeof entryValue !== 'undefined')
					.sort(([a], [b]) => {
						if (a < b) {
							return -1;
						}
						if (a > b) {
							return 1;
						}
						return 0;
					});
				const sorted: Record<string, unknown> = {};
				for (const [entryKey, entryValue] of entries) {
					sorted[entryKey] = entryValue;
				}
				return sorted;
			}
			if (typeof rawValue === 'function') {
				return '[Function]';
			}
			if (typeof rawValue === 'bigint') {
				return rawValue.toString();
			}
			return rawValue;
		},
	);
	return json ?? 'null';
}

function hashPlayer(player: SessionPlayerStateSnapshot): string {
	return stableSerialize(player);
}

function hashGameState(
	game: SessionSnapshot['game'],
	phases: SessionSnapshot['phases'],
): string {
	return stableSerialize({
		turn: game.turn,
		currentPlayerIndex: game.currentPlayerIndex,
		currentPhase: game.currentPhase,
		currentStep: game.currentStep,
		phaseIndex: game.phaseIndex,
		stepIndex: game.stepIndex,
		activePlayerId: game.activePlayerId,
		opponentId: game.opponentId,
		devMode: game.devMode,
		phases,
	});
}

export function useNextTurnForecast(): NextTurnForecast {
	const { session, sessionState } = useGameEngine();
	const { game, phases } = sessionState;
	const players = game.players;
	const hashKey = useMemo(() => {
		const gameHash = hashGameState(game, phases);
		const playerHashes = players.map((player) => hashPlayer(player));
		return [gameHash, playerHashes.join(',')].join('#');
	}, [
		game.activePlayerId,
		game.currentPhase,
		game.currentPlayerIndex,
		game.currentStep,
		game.devMode,
		game.opponentId,
		game.phaseIndex,
		game.stepIndex,
		game.turn,
		phases,
		players,
	]);
	const cacheRef = useRef<{ key: string; value: NextTurnForecast }>();
	return useMemo(() => {
		if (cacheRef.current?.key === hashKey) {
			return cacheRef.current.value;
		}
		const forecast: NextTurnForecast = {};
		for (const player of players) {
			try {
				const { delta } = session.simulateUpcomingPhases(player.id);
				forecast[player.id] = delta;
			} catch (error) {
				forecast[player.id] = cloneEmptyDelta();
			}
		}
		cacheRef.current = { key: hashKey, value: forecast };
		return forecast;
	}, [session, hashKey, players]);
}
