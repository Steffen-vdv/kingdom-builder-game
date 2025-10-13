import { useEffect, useRef } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol';
import {
	diffStepSnapshots,
	snapshotPlayer,
	type PlayerSnapshot,
	type TranslationDiffContext,
} from '../translation';
import { getLegacySessionContext } from './getLegacySessionContext';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';

interface UseCompensationLoggerOptions {
	sessionId: string;
	sessionState: SessionSnapshot;
	addLog: (
		entry: string | string[],
		player?: SessionSnapshot['game']['players'][number],
	) => void;
	resourceKeys: SessionResourceKey[];
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
	>;
}

export function useCompensationLogger({
	sessionId,
	sessionState,
	addLog,
	resourceKeys,
	registries,
}: UseCompensationLoggerOptions) {
	const loggedSessionRef = useRef<string | null>(null);
	const loggedPlayersRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		if (loggedSessionRef.current !== sessionId) {
			loggedSessionRef.current = sessionId;
			loggedPlayersRef.current = new Set();
		}
		if (sessionState.game.turn !== 1) {
			return;
		}
		const { diffContext: baseDiffContext } = getLegacySessionContext({
			snapshot: sessionState,
			ruleSnapshot: sessionState.rules,
			passiveRecords: sessionState.passiveRecords,
			registries,
		});
		sessionState.game.players.forEach((player) => {
			if (loggedPlayersRef.current.has(player.id)) {
				return;
			}
			const compensation = sessionState.compensations[player.id];
			if (
				!compensation ||
				(Object.keys(compensation.resources || {}).length === 0 &&
					Object.keys(compensation.stats || {}).length === 0)
			) {
				return;
			}
			const after: PlayerSnapshot = snapshotPlayer(player);
			const before: PlayerSnapshot = {
				...after,
				resources: { ...after.resources },
				stats: { ...after.stats },
				population: { ...after.population },
				buildings: [...after.buildings],
				lands: after.lands.map((land) => ({
					...land,
					developments: [...land.developments],
				})),
				passives: [...after.passives],
			};
			for (const [resourceKey, resourceDelta] of Object.entries(
				compensation.resources || {},
			)) {
				before.resources[resourceKey] =
					(before.resources[resourceKey] || 0) - (resourceDelta ?? 0);
			}
			for (const [statKey, statDelta] of Object.entries(
				compensation.stats || {},
			)) {
				before.stats[statKey] = (before.stats[statKey] || 0) - (statDelta ?? 0);
			}
			const diffContext: TranslationDiffContext = {
				...baseDiffContext,
				activePlayer: {
					...baseDiffContext.activePlayer,
					id: player.id,
				},
			};
			const lines = diffStepSnapshots(
				before,
				after,
				undefined,
				diffContext,
				resourceKeys,
			);
			if (lines.length) {
				addLog(
					['Last-player compensation:', ...lines.map((line) => `  ${line}`)],
					player,
				);
				loggedPlayersRef.current.add(player.id);
			}
		});
	}, [addLog, registries, resourceKeys, sessionId, sessionState]);
}
