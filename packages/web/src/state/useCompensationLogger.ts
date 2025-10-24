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
import {
	getResourceIdForLegacy,
	type LegacyResourceBucket,
} from '../components/common/resourceV2Mappings';

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
		const {
			diffContext: baseDiffContext,
			translationContext: baseTranslationContext,
		} = createSessionTranslationContext({
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
				...(after.resourcesV2 ? { resourcesV2: { ...after.resourcesV2 } } : {}),
				...(after.resourceBoundsV2
					? {
							resourceBoundsV2: Object.fromEntries(
								Object.entries(after.resourceBoundsV2).map(([id, entry]) => [
									id,
									{ ...entry },
								]),
							),
						}
					: {}),
			};
			const adjustResourceV2 = (
				bucket: LegacyResourceBucket,
				key: string,
				delta: number,
			) => {
				const resourceId = getResourceIdForLegacy(bucket, key);
				if (!resourceId || !before.resourcesV2) {
					return;
				}
				const current = before.resourcesV2[resourceId] ?? 0;
				before.resourcesV2[resourceId] = current - delta;
			};
			for (const [resourceKey, resourceDelta] of Object.entries(
				compensation.resources || {},
			)) {
				before.resources[resourceKey] =
					(before.resources[resourceKey] || 0) - (resourceDelta ?? 0);
				if (typeof resourceDelta === 'number') {
					adjustResourceV2('resources', resourceKey, resourceDelta);
				}
			}
			for (const [statKey, statDelta] of Object.entries(
				compensation.stats || {},
			)) {
				before.stats[statKey] = (before.stats[statKey] || 0) - (statDelta ?? 0);
				if (typeof statDelta === 'number') {
					adjustResourceV2('stats', statKey, statDelta);
				}
			}
			const diffContext: TranslationDiffContext = {
				...baseDiffContext,
				activePlayer: {
					...baseDiffContext.activePlayer,
					id: player.id,
				},
			};
			const tieredResourceOptions = baseTranslationContext.rules
				.tieredResourceKey
				? { tieredResourceKey: baseTranslationContext.rules.tieredResourceKey }
				: undefined;
			const diffResult = diffStepSnapshots(
				before,
				after,
				undefined,
				diffContext,
				resourceKeys,
				tieredResourceOptions,
			);
			if (diffResult.summaries.length) {
				const headline = 'Last-player compensation';
				const messages = ensureTimelineLines([headline]);
				const timeline = buildActionLogTimeline(messages, diffResult.tree);
				const formattedLines = formatActionLogLines(messages, diffResult.tree);
				const source = {
					kind: 'phase' as const,
					label: 'Compensation',
					name: 'Compensation',
				} satisfies ActionResolution['source'];
				const resolution = createResolutionLogSnapshot({
					lines: formattedLines,
					timeline,
					summaries: [...diffResult.summaries],
					source,
					player: { id: player.id, name: player.name },
				});
				addResolutionLog(resolution);
				loggedPlayersRef.current.add(player.id);
			}
		});
	}, [addResolutionLog, registries, resourceKeys, sessionId, sessionSnapshot]);
}
