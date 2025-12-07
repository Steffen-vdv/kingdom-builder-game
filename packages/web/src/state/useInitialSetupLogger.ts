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

interface UseInitialSetupLoggerOptions {
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

/**
 * Logs the initial setup actions for both players when a session starts.
 * These log entries appear in the action log but do NOT block with an
 * ActionResolutionCard (requireAcknowledgement: false).
 */
export function useInitialSetupLogger({
	sessionId,
	sessionSnapshot,
	addResolutionLog,
	resourceKeys,
	registries,
}: UseInitialSetupLoggerOptions) {
	const loggedSessionRef = useRef<string | null>(null);
	const loggedPlayersRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		// Reset tracking when session changes
		if (loggedSessionRef.current !== sessionId) {
			loggedSessionRef.current = sessionId;
			loggedPlayersRef.current = new Set();
		}

		// Only log on turn 1 (the initial state)
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

		const isDevMode = sessionSnapshot.game.devMode;
		const actionId = isDevMode ? 'initial_setup_devmode' : 'initial_setup';
		const actionName = isDevMode ? 'Initial Setup (Dev Mode)' : 'Initial Setup';
		const actionIcon = isDevMode ? '🛠️' : '🎮';

		sessionSnapshot.game.players.forEach((player) => {
			// Skip if already logged for this player in this session
			if (loggedPlayersRef.current.has(player.id)) {
				return;
			}

			// The "after" state is the current player snapshot
			const after: PlayerSnapshot = snapshotPlayer(player);

			// The "before" state is the baseline: all zeros, no lands, no buildings
			const before: PlayerSnapshot = {
				...after,
				valuesV2: {},
				buildings: [],
				lands: [],
				passives: [],
			};

			// Initialize all resource values to 0 in the before state
			for (const resourceKey of Object.keys(after.valuesV2)) {
				before.valuesV2[resourceKey] = 0;
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

			// Only log if there were actual changes
			if (diffResult.summaries.length) {
				const headline = actionName;
				const messages = ensureTimelineLines([headline]);
				const timeline = buildActionLogTimeline(messages, diffResult.tree);
				const formattedLines = formatActionLogLines(messages, diffResult.tree);

				const source = {
					kind: 'action' as const,
					label: 'System',
					id: actionId,
					name: actionName,
					icon: actionIcon,
				} satisfies ActionResolution['source'];

				const resolution = createResolutionLogSnapshot({
					lines: formattedLines,
					timeline,
					summaries: [...diffResult.summaries],
					source,
					player: { id: player.id, name: player.name },
					requireAcknowledgement: false,
				});

				addResolutionLog(resolution);
				loggedPlayersRef.current.add(player.id);
			}
		});
	}, [addResolutionLog, registries, resourceKeys, sessionId, sessionSnapshot]);
}
