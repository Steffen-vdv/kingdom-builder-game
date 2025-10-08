import { useEffect, useRef } from 'react';
import type {
	EngineSession,
	EngineSessionSnapshot,
} from '@kingdom-builder/engine';
import type { ResourceKey } from '@kingdom-builder/contents';
import {
	createSnapshotDiffPlayer,
	createSnapshotTranslationDiffContext,
	diffStepSnapshots,
	snapshotPlayer,
	type PlayerSnapshot,
	type TranslationDiffContext,
} from '../translation';
import type { TranslationContext } from '../translation/context';

interface UseCompensationLoggerOptions {
	session: EngineSession;
	sessionState: EngineSessionSnapshot;
	addLog: (
		entry: string | string[],
		player?: EngineSessionSnapshot['game']['players'][number],
	) => void;
	resourceKeys: ResourceKey[];
	translationContext: TranslationContext;
}

export function useCompensationLogger({
	session,
	sessionState,
	addLog,
	resourceKeys,
	translationContext,
}: UseCompensationLoggerOptions) {
	const loggedSessionRef = useRef<EngineSession | null>(null);
	const loggedPlayersRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		if (loggedSessionRef.current !== session) {
			loggedSessionRef.current = session;
			loggedPlayersRef.current = new Set();
		}
		if (sessionState.game.turn !== 1) {
			return;
		}
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
			const diffPlayer = createSnapshotDiffPlayer({
				id: player.id,
				lands: after.lands,
				population: after.population,
				passives: after.passives,
			});
			const diffContext: TranslationDiffContext =
				createSnapshotTranslationDiffContext({
					player: diffPlayer,
					translation: {
						buildings: translationContext.buildings,
						developments: translationContext.developments,
						passives: {
							evaluationMods: translationContext.passives.evaluationMods,
						},
					},
					evaluationMods: session.getPassiveEvaluationMods(),
				});
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
	}, [addLog, resourceKeys, session, sessionState, translationContext]);
}
