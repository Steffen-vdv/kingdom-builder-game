import { useEffect, useMemo, useRef, useState } from 'react';
import type {
	PlayerSnapshotDeltaBucket,
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import { useGameEngine } from './GameContext';
import { enqueueSimulateUpcomingPhases } from './sessionSdk';

export type NextTurnForecast = Record<string, PlayerSnapshotDeltaBucket>;

interface ForecastCacheEntry {
	key: string;
	value: NextTurnForecast;
}

const forecastCache = new Map<string, ForecastCacheEntry>();
const inflightRequests = new Set<string>();
const resolvedRequests = new Map<string, string>();

export function resetNextTurnForecastCacheForTests(): void {
	forecastCache.clear();
	inflightRequests.clear();
	resolvedRequests.clear();
}

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
		const requestKey = `${sessionId}#${hashKey}`;
		if (resolvedRequests.get(sessionId) === hashKey) {
			cacheRef.current = forecastCache.get(sessionId) ?? null;
			return;
		}
		if (inflightRequests.has(requestKey)) {
			return;
		}
		requestKeyRef.current = hashKey;
		inflightRequests.add(requestKey);
		const run = async () => {
			const updates: NextTurnForecast = {};
			let hasSuccess = false;
			let hasError = false;
			await Promise.all(
				playerIds.map(async (playerId) => {
					try {
						const response = await enqueueSimulateUpcomingPhases(
							sessionId,
							playerId,
						);
						updates[playerId] = response.result.delta;
						hasSuccess = true;
					} catch (error) {
						void error;
						hasError = true;
					}
				}),
			);
			if (disposed) {
				inflightRequests.delete(requestKey);
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
				const entry: ForecastCacheEntry = {
					key: hashKey,
					value: merged,
				};
				cacheRef.current = entry;
				forecastCache.set(sessionId, entry);
				resolvedRequests.set(sessionId, hashKey);
				inflightRequests.delete(requestKey);
				setRevision((value) => value + 1);
			} else if (hasError) {
				requestKeyRef.current = null;
				inflightRequests.delete(requestKey);
				resolvedRequests.delete(sessionId);
			}
		};
		void run();
		return () => {
			disposed = true;
			inflightRequests.delete(requestKey);
		};
	}, [hashKey, playerIds, session, sessionId]);

	return useMemo(() => {
		if (cacheRef.current?.key === hashKey) {
			return cacheRef.current.value;
		}
		const sessionEntry = forecastCache.get(sessionId);
		if (sessionEntry?.key === hashKey) {
			cacheRef.current = sessionEntry;
			return sessionEntry.value;
		}
		const forecast: NextTurnForecast = {};
		for (const player of players) {
			try {
				const { delta } = session.simulateUpcomingPhases(player.id);
				forecast[player.id] = delta;
			} catch (error) {
				void error;
				forecast[player.id] = cloneEmptyDelta();
			}
		}
		const entry: ForecastCacheEntry = { key: hashKey, value: forecast };
		cacheRef.current = entry;
		forecastCache.set(sessionId, entry);
		return forecast;
	}, [session, hashKey, players, revision, sessionId]);
}
