import { useEffect, useMemo, useRef, useState } from 'react';
import type {
	PlayerSnapshotDeltaBucket,
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import { useGameEngine } from './GameContext';
import { simulateUpcomingPhases } from './sessionSdk';

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
	const { session, sessionState, sessionId } = useGameEngine();
	const { game, phases } = sessionState;
	const players = game.players;
	const playerIds = useMemo(
		() => players.map((player) => player.id),
		[players],
	);
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
	const [revision, setRevision] = useState(0);
	const cacheRef = useRef<{ key: string; value: NextTurnForecast } | null>(
		null,
	);
	const requestKeyRef = useRef<string | null>(null);

	useEffect(() => {
		let disposed = false;
		if (requestKeyRef.current === hashKey) {
			return;
		}
		requestKeyRef.current = hashKey;
		const run = async () => {
			const updates: NextTurnForecast = {};
			let hasSuccess = false;
			let hasError = false;
			await Promise.all(
				playerIds.map(async (playerId) => {
					try {
						const response = await session.enqueue(() =>
							simulateUpcomingPhases({
								sessionId,
								playerId,
							}),
						);
						updates[playerId] = response.result.delta;
						hasSuccess = true;
					} catch {
						hasError = true;
					}
				}),
			);
			if (disposed) {
				return;
			}
			if (hasSuccess) {
				const existing =
					cacheRef.current?.key === hashKey
						? cacheRef.current.value
						: undefined;
				const merged: NextTurnForecast = {};
				for (const playerId of playerIds) {
					if (updates[playerId]) {
						merged[playerId] = updates[playerId];
						continue;
					}
					if (existing?.[playerId]) {
						merged[playerId] = existing[playerId];
						continue;
					}
					merged[playerId] = cloneEmptyDelta();
				}
				cacheRef.current = { key: hashKey, value: merged };
				setRevision((value) => value + 1);
			} else if (hasError) {
				requestKeyRef.current = null;
			}
		};
		void run();
		return () => {
			disposed = true;
		};
	}, [hashKey, playerIds, session, sessionId]);

	return useMemo(() => {
		if (cacheRef.current?.key === hashKey) {
			return cacheRef.current.value;
		}
		const forecast: NextTurnForecast = {};
		for (const player of players) {
			try {
				const simulation = session.simulateUpcomingPhases(player.id);
				forecast[player.id] = simulation.delta;
			} catch {
				forecast[player.id] = cloneEmptyDelta();
			}
		}
		cacheRef.current = { key: hashKey, value: forecast };
		return forecast;
	}, [session, hashKey, players, revision]);
}
