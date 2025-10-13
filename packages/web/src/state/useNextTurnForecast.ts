import { useEffect, useMemo, useRef, useState } from 'react';
import type {
	PlayerSnapshotDeltaBucket,
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import { useGameEngine } from './GameContext';
import type { LegacySession } from './sessionTypes';
import { simulateUpcomingPhases as requestSimulation } from './sessionSdk';

export type NextTurnForecast = Record<string, PlayerSnapshotDeltaBucket>;

function cloneEmptyDelta(): PlayerSnapshotDeltaBucket {
	return {
		resources: {},
		stats: {},
		population: {},
	};
}

function cloneDelta(
	delta: PlayerSnapshotDeltaBucket,
): PlayerSnapshotDeltaBucket {
	if (typeof structuredClone === 'function') {
		return structuredClone(delta);
	}
	return JSON.parse(JSON.stringify(delta)) as PlayerSnapshotDeltaBucket;
}

function buildEmptyForecast(
	players: SessionPlayerStateSnapshot[],
): NextTurnForecast {
	const forecast: NextTurnForecast = {};
	for (const player of players) {
		forecast[player.id] = cloneEmptyDelta();
	}
	return forecast;
}

function readCachedForecast(
	session: LegacySession,
	players: SessionPlayerStateSnapshot[],
): NextTurnForecast | null {
	const forecast: NextTurnForecast = {};
	for (const player of players) {
		try {
			const { delta } = session.simulateUpcomingPhases(player.id);
			forecast[player.id] = cloneDelta(delta);
		} catch (error) {
			return null;
		}
	}
	return forecast;
}

async function requestForecast(
	session: LegacySession,
	sessionId: string,
	players: SessionPlayerStateSnapshot[],
): Promise<NextTurnForecast> {
	const entries = await Promise.all(
		players.map(async (player) => {
			const delta = await session
				.enqueue(() =>
					requestSimulation({
						sessionId,
						playerId: player.id,
					}),
				)
				.then((response) => cloneDelta(response.result.delta))
				.catch(() => {
					try {
						const { delta: cachedDelta } = session.simulateUpcomingPhases(
							player.id,
						);
						return cloneDelta(cachedDelta);
					} catch (error) {
						return cloneEmptyDelta();
					}
				});
			return [player.id, delta] as const;
		}),
	);
	const forecast: NextTurnForecast = {};
	for (const [playerId, delta] of entries) {
		forecast[playerId] = delta;
	}
	return forecast;
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
	const { sessionId, session, sessionState } = useGameEngine();
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
	const pendingRef = useRef<Map<string, Promise<NextTurnForecast>>>(new Map());
	const lastAppliedKeyRef = useRef<string>();
	const [forecastState, setForecastState] = useState<NextTurnForecast>(() => {
		if (cacheRef.current?.key === hashKey) {
			return cacheRef.current.value;
		}
		const cached = readCachedForecast(session, players);
		if (cached) {
			cacheRef.current = { key: hashKey, value: cached };
			return cached;
		}
		return buildEmptyForecast(players);
	});

	useEffect(() => {
		let disposed = false;

		if (cacheRef.current?.key === hashKey) {
			if (forecastState !== cacheRef.current.value) {
				setForecastState(cacheRef.current.value);
			}
			lastAppliedKeyRef.current = hashKey;
			return () => {
				disposed = true;
			};
		}

		const cached = readCachedForecast(session, players);
		if (cached) {
			cacheRef.current = { key: hashKey, value: cached };
			if (forecastState !== cached) {
				setForecastState(cached);
			}
			lastAppliedKeyRef.current = hashKey;
			return () => {
				disposed = true;
			};
		}

		if (lastAppliedKeyRef.current !== hashKey) {
			const empty = buildEmptyForecast(players);
			if (forecastState !== empty) {
				setForecastState(empty);
			}
			lastAppliedKeyRef.current = hashKey;
		}

		const existing = pendingRef.current.get(hashKey);
		const promise = existing ?? requestForecast(session, sessionId, players);
		if (!existing) {
			pendingRef.current.set(hashKey, promise);
		}

		promise
			.then((value) => {
				if (disposed) {
					return;
				}
				cacheRef.current = { key: hashKey, value };
				setForecastState(value);
			})
			.catch(() => {
				if (disposed) {
					return;
				}
				const fallback = buildEmptyForecast(players);
				cacheRef.current = { key: hashKey, value: fallback };
				setForecastState(fallback);
			})
			.finally(() => {
				if (pendingRef.current.get(hashKey) === promise) {
					pendingRef.current.delete(hashKey);
				}
			});

		return () => {
			disposed = true;
		};
	}, [hashKey, session, sessionId, players, forecastState]);

	return forecastState;
}
