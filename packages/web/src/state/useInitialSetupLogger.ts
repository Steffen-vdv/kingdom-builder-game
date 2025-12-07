import { useEffect, useRef } from 'react';
import type {
	ActionTrace,
	SessionPlayerId,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import {
	diffStepSnapshots,
	snapshotPlayer,
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
		| 'resources'
	>;
}

/**
 * Logs the initial setup actions for both players using engine-provided traces.
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
	// Track which traces have been logged by their unique key (playerId:actionId)
	const loggedTracesRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		// Reset tracking when session changes
		if (loggedSessionRef.current !== sessionId) {
			loggedSessionRef.current = sessionId;
			loggedTracesRef.current = new Set();
		}

		// Only log on turn 1 (the initial state)
		if (sessionSnapshot.game.turn !== 1) {
			return;
		}

		// Skip if no initial setup traces available
		const { initialSetupTraces } = sessionSnapshot;
		if (!initialSetupTraces) {
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

		const tieredResourceOptions = baseTranslationContext.rules.tieredResourceKey
			? { tieredResourceKey: baseTranslationContext.rules.tieredResourceKey }
			: undefined;

		// Process traces for each player
		for (const player of sessionSnapshot.game.players) {
			const playerTraces = initialSetupTraces[player.id] ?? [];

			for (const trace of playerTraces) {
				const traceKey = `${player.id}:${trace.id}`;

				// Skip if already logged
				if (loggedTracesRef.current.has(traceKey)) {
					continue;
				}

				logTrace(trace, player.id, player.name, {
					baseDiffContext,
					resourceKeys,
					tieredResourceOptions,
					registries,
					addResolutionLog,
				});

				loggedTracesRef.current.add(traceKey);
			}
		}
	}, [addResolutionLog, registries, resourceKeys, sessionId, sessionSnapshot]);
}

interface LogTraceOptions {
	baseDiffContext: TranslationDiffContext;
	resourceKeys: SessionResourceKey[];
	tieredResourceOptions: { tieredResourceKey: string } | undefined;
	registries: Pick<SessionRegistries, 'actions'>;
	addResolutionLog: (resolution: ActionResolution) => void;
}

function logTrace(
	trace: ActionTrace,
	playerId: SessionPlayerId,
	playerName: string,
	options: LogTraceOptions,
) {
	const {
		baseDiffContext,
		resourceKeys,
		tieredResourceOptions,
		registries,
		addResolutionLog,
	} = options;

	// Get action metadata from registry
	const actionDef = registries.actions.has(trace.id)
		? registries.actions.get(trace.id)
		: null;
	const actionName = actionDef?.name ?? trace.id;
	const actionIcon = actionDef?.icon ?? '🎮';

	// Convert protocol snapshots to translation layer format
	const before = snapshotPlayer(trace.before);
	const after = snapshotPlayer(trace.after);

	const diffContext: TranslationDiffContext = {
		...baseDiffContext,
		activePlayer: {
			...baseDiffContext.activePlayer,
			id: playerId,
		},
	};

	const diffResult = diffStepSnapshots(
		before,
		after,
		undefined,
		diffContext,
		resourceKeys,
		tieredResourceOptions,
	);

	// Only log if there were actual changes
	if (!diffResult.summaries.length) {
		return;
	}

	const headline = actionName;
	const messages = ensureTimelineLines([headline]);
	const timeline = buildActionLogTimeline(messages, diffResult.tree);
	const formattedLines = formatActionLogLines(messages, diffResult.tree);

	const source = {
		kind: 'action' as const,
		label: 'System',
		id: trace.id,
		name: actionName,
		icon: actionIcon,
	} satisfies ActionResolution['source'];

	const resolution = createResolutionLogSnapshot({
		lines: formattedLines,
		timeline,
		summaries: [...diffResult.summaries],
		source,
		player: { id: playerId, name: playerName },
		requireAcknowledgement: false,
	});

	addResolutionLog(resolution);
}
