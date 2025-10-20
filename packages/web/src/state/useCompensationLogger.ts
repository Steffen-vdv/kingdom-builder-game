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
import type { ActionResolution } from './useActionResolution';
import { ensureTimelineLines } from './useActionPerformer.helpers';
import { createResolutionLogSnapshot } from './actionResolutionLog';
import {
	buildActionLogTimeline,
	formatActionLogLines,
} from './actionLogFormat';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';

interface UseCompensationLoggerOptions {
	sessionId: string;
	sessionSnapshot: SessionSnapshot;
	addResolutionLog: (resolution: ActionResolution) => void;
	resourceKeys: SessionResourceKey[];
	registries: Pick<
		SessionRegistries,
		| 'actions'
		| 'actionCategories'
		| 'buildings'
		| 'developments'
		| 'populations'
		| 'resources'
	>;
}

export function useCompensationLogger({
	sessionId,
	sessionSnapshot,
	addResolutionLog,
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
				const baseMessages = ensureTimelineLines([headline]);
				const effectMessages: ActionLogLineDescriptor[] = lines.map((line) => ({
					text: line,
					depth: 1,
					kind: 'effect',
				}));
				const messages = [...baseMessages, ...effectMessages];
				const timeline = buildActionLogTimeline(messages, []);
				const formattedLines = formatActionLogLines(messages, []);
				const source = {
					kind: 'phase' as const,
					label: 'Compensation',
					name: 'Compensation',
				} satisfies ActionResolution['source'];
				const resolution = createResolutionLogSnapshot({
					lines: formattedLines,
					timeline,
					summaries: [...lines],
					source,
					player: { id: player.id, name: player.name },
				});
				addResolutionLog(resolution);
				loggedPlayersRef.current.add(player.id);
			}
		});
	}, [addResolutionLog, registries, resourceKeys, sessionId, sessionSnapshot]);
}
