import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import {
	SESSION_AI_ACTION_LOG_KEY,
	type SessionAiActionLogEntry,
	type SessionPlayerStateSnapshot,
	type SessionSnapshot,
} from '@kingdom-builder/protocol';
import { getSessionSnapshot, getSessionRecord } from './sessionStateStore';
import { enqueueSessionTask, hasAiController, runAiTurn } from './sessionAi';
import type { PhaseProgressState } from './usePhaseProgress';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import type { ShowResolutionOptions } from './useActionResolution';
import { presentAiActionLogs } from './aiActionResolution';

interface UseAiRunnerOptions {
	sessionId: string;
	sessionSnapshot: SessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	mountedRef: MutableRefObject<boolean>;
	actionCostResource: SessionResourceKey;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'resources' | 'populations'
	>;
	resourceKeys: SessionResourceKey[];
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	addLog: (
		entry: string | string[],
		player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
	) => void;
	onFatalSessionError?: (error: unknown) => void;
}

function isAiActionLogEntry(value: unknown): value is SessionAiActionLogEntry {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const entry = value as Record<string, unknown>;
	if (
		typeof entry.turn !== 'number' ||
		typeof entry.sequence !== 'number' ||
		typeof entry.playerId !== 'string' ||
		typeof entry.actionId !== 'string' ||
		!Array.isArray(entry.traces)
	) {
		return false;
	}
	return entry.traces.every((trace) => {
		if (typeof trace !== 'object' || trace === null) {
			return false;
		}
		const detail = trace as Record<string, unknown>;
		if (typeof detail.id !== 'string') {
			return false;
		}
		const before = detail.before as Record<string, unknown> | undefined;
		const after = detail.after as Record<string, unknown> | undefined;
		const isSnapshot = (snapshot: Record<string, unknown> | undefined) =>
			Boolean(
				snapshot &&
					typeof snapshot.resources === 'object' &&
					typeof snapshot.stats === 'object' &&
					Array.isArray(snapshot.buildings) &&
					Array.isArray(snapshot.lands) &&
					Array.isArray(snapshot.passives),
			);
		return isSnapshot(before) && isSnapshot(after);
	});
}

export function useAiRunner({
	sessionId,
	sessionSnapshot,
	runUntilActionPhaseCore,
	syncPhaseState,
	mountedRef,
	actionCostResource,
	registries,
	resourceKeys,
	showResolution,
	addLog,
	onFatalSessionError,
}: UseAiRunnerOptions) {
	const processedLogIdsRef = useRef<Set<string>>(new Set());
	const lastProcessedTurnRef = useRef<number | null>(null);
	useEffect(() => {
		const phaseDefinition =
			sessionSnapshot.phases[sessionSnapshot.game.phaseIndex];
		if (!phaseDefinition?.action) {
			return;
		}
		if (sessionSnapshot.game.conclusion) {
			return;
		}
		const activeId = sessionSnapshot.game.activePlayerId;
		if (!hasAiController(sessionId, activeId)) {
			return;
		}
		if (lastProcessedTurnRef.current !== sessionSnapshot.game.turn) {
			processedLogIdsRef.current.clear();
			lastProcessedTurnRef.current = sessionSnapshot.game.turn;
		}
		void (async () => {
			let fatalError: unknown = null;
			const forwardFatalError = (error: unknown) => {
				if (fatalError !== null) {
					return;
				}
				fatalError = error;
				if (isFatalSessionError(error)) {
					return;
				}
				if (onFatalSessionError) {
					markFatalSessionError(error);
					onFatalSessionError(error);
				}
			};
			try {
				let continueRunning = true;
				let currentActiveId = activeId;
				while (continueRunning) {
					const ranTurn = await runAiTurn(sessionId, currentActiveId);
					if (fatalError !== null) {
						return;
					}
					const record = getSessionRecord(sessionId);
					const snapshot = record?.snapshot ?? getSessionSnapshot(sessionId);
					syncPhaseState(snapshot);
					const effectLogs = record?.metadata.effectLogs;
					const rawLogList = effectLogs?.[SESSION_AI_ACTION_LOG_KEY];
					const rawLogs = Array.isArray(rawLogList) ? rawLogList : [];
					const newLogs: SessionAiActionLogEntry[] = [];
					for (const candidate of rawLogs) {
						if (!isAiActionLogEntry(candidate)) {
							continue;
						}
						const key = `${candidate.turn}:${candidate.sequence}`;
						if (processedLogIdsRef.current.has(key)) {
							continue;
						}
						processedLogIdsRef.current.add(key);
						newLogs.push(candidate);
					}
					if (newLogs.length > 0) {
						await presentAiActionLogs({
							logs: newLogs,
							snapshot,
							registries,
							resourceKeys,
							showResolution,
							addLog,
						});
					}
					if (!mountedRef.current || fatalError !== null) {
						return;
					}
					const latestRecord = getSessionRecord(sessionId);
					const latestSnapshot = latestRecord?.snapshot ?? snapshot;
					const latestPhase =
						latestSnapshot.phases[latestSnapshot.game.phaseIndex];
					const latestActivePlayer = latestSnapshot.game.players.find(
						(player) => player.id === latestSnapshot.game.activePlayerId,
					);
					const isActionPhase = Boolean(latestPhase?.action);
					const isAiActive = Boolean(latestActivePlayer?.aiControlled);
					currentActiveId = latestSnapshot.game.activePlayerId;
					if (!isActionPhase || !isAiActive) {
						continueRunning = false;
						break;
					}
					const remaining =
						latestActivePlayer?.resources[actionCostResource] ?? 0;
					if (remaining <= 0) {
						continueRunning = false;
						continue;
					}
					if (!ranTurn || newLogs.length === 0) {
						break;
					}
				}
				if (fatalError !== null) {
					return;
				}
				if (!mountedRef.current) {
					return;
				}
				void enqueueSessionTask(sessionId, async () => {
					if (fatalError !== null) {
						return;
					}
					try {
						syncPhaseState(getSessionSnapshot(sessionId), {
							isAdvancing: true,
							canEndTurn: false,
						});
						await runUntilActionPhaseCore();
					} catch (error) {
						forwardFatalError(error);
					}
				});
			} catch (error) {
				forwardFatalError(error);
			}
		})();
	}, [
		sessionId,
		sessionSnapshot.game.activePlayerId,
		sessionSnapshot.game.phaseIndex,
		sessionSnapshot.phases,
		runUntilActionPhaseCore,
		syncPhaseState,
		mountedRef,
		actionCostResource,
		registries,
		resourceKeys,
		showResolution,
		addLog,
		onFatalSessionError,
	]);
}
