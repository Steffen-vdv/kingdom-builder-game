import { useEffect, useRef } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol';
import {
	diffStepSnapshots,
	snapshotPlayer,
	type PlayerSnapshot,
	type TranslationDiffContext,
} from '../translation';
import { createSessionTranslationContext } from './createSessionTranslationContext';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import {
	buildActionLogTimeline,
	formatActionLogLines,
} from './actionLogFormat';
import { createResolutionLogSnapshot } from './createResolutionLogSnapshot';
import type { ActionResolution } from './useActionResolution';

interface UseCompensationLoggerOptions {
	sessionId: string;
	sessionSnapshot: SessionSnapshot;
	addLog: (
		entry: string | string[],
		player?: SessionSnapshot['game']['players'][number],
	) => void;
	addResolutionLog: (resolution: ActionResolution) => void;
	resourceKeys: SessionResourceKey[];
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
	>;
}

export function useCompensationLogger({
	sessionId,
	sessionSnapshot,
	addLog: _addLog,
	addResolutionLog,
	resourceKeys,
	registries,
}: UseCompensationLoggerOptions) {
	void _addLog;
	const loggedSessionRef = useRef<string | null>(null);
	const loggedPlayersRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		if (loggedSessionRef.current !== sessionId) {
			loggedSessionRef.current = sessionId;
			loggedPlayersRef.current = new Set();
		}
		if (sessionSnapshot.game.turn !== 1) {
			return;
		}
		const { diffContext: baseDiffContext } = createSessionTranslationContext({
			snapshot: sessionSnapshot,
			ruleSnapshot: sessionSnapshot.rules,
			passiveRecords: sessionSnapshot.passiveRecords,
			registries,
		});
		sessionSnapshot.game.players.forEach((player) => {
			if (loggedPlayersRef.current.has(player.id)) {
				return;
			}
			const compensation = sessionSnapshot.compensations[player.id];
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
				const headline = 'Last-player compensation';
				const descriptors = [
					{
						text: headline,
						depth: 0,
						kind: 'headline' as const,
					},
					...lines.map((line) => ({
						text: line,
						depth: 1,
						kind: 'effect' as const,
					})),
				];
				const timeline = buildActionLogTimeline(descriptors, []);
				const logLines = formatActionLogLines(descriptors, []);
				const resolution = createResolutionLogSnapshot({
					lines: logLines,
					timeline,
					summaries: lines,
					player: { id: player.id, name: player.name },
					source: { kind: 'phase', label: 'Compensation' },
				});
				addResolutionLog(resolution);
				loggedPlayersRef.current.add(player.id);
			}
		});
	}, [addResolutionLog, registries, resourceKeys, sessionId, sessionSnapshot]);
}
