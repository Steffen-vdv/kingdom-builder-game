import { useCallback, useRef, useState } from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { ActionResolution } from './useActionResolution';

const ACTION_EFFECT_DELAY = 600;
const MAX_LOG_ENTRIES = 250;

type LogEntryBase = {
	id: number;
	time: string;
	playerId: string;
};

type TextLogEntry = LogEntryBase & {
	kind: 'text';
	text: string;
};

type ResolutionLogEntry = LogEntryBase & {
	kind: 'resolution';
	resolution: ActionResolution;
};

type LogEntry = TextLogEntry | ResolutionLogEntry;

interface GameLogOptions {
	sessionSnapshot: SessionSnapshot;
}

type PhaseSource = Extract<ActionResolution['source'], { kind: 'phase' }>;

function isPhaseSourceDetail(
	source: ActionResolution['source'],
): source is PhaseSource {
	return typeof source !== 'string' && source.kind === 'phase';
}

function resolvePhaseIdentity(source: PhaseSource) {
	return source.id?.trim() || source.label?.trim() || null;
}

function cloneResolution(
	resolution: ActionResolution,
	resolvedPlayer: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
): ActionResolution {
	const lineSnapshot = [...resolution.lines];
	const visibleLineSnapshot = [...lineSnapshot];
	const timelineSnapshot = resolution.timeline.map((descriptor) => ({
		...descriptor,
	}));
	const visibleTimelineSnapshot = timelineSnapshot.map((descriptor) => ({
		...descriptor,
	}));
	const sourceSnapshot =
		typeof resolution.source === 'string'
			? resolution.source
			: { ...resolution.source };
	const actionSnapshot = resolution.action
		? { ...resolution.action }
		: undefined;
	return {
		lines: lineSnapshot,
		visibleLines: visibleLineSnapshot,
		timeline: timelineSnapshot,
		visibleTimeline: visibleTimelineSnapshot,
		isComplete: true,
		summaries: [...resolution.summaries],
		source: sourceSnapshot,
		requireAcknowledgement: false,
		player: resolvedPlayer,
		...(resolution.actorLabel ? { actorLabel: resolution.actorLabel } : {}),
		...(actionSnapshot ? { action: actionSnapshot } : {}),
	};
}

export function useGameLog({ sessionSnapshot }: GameLogOptions) {
	const [log, setLog] = useState<LogEntry[]>([]);
	const [logOverflowed, setLogOverflowed] = useState(false);
	const nextLogIdRef = useRef(0);

	const appendEntries = useCallback((entries: LogEntry[]) => {
		setLog((previous) => {
			const combined = [...previous, ...entries];
			const next = combined.slice(-MAX_LOG_ENTRIES);
			if (next.length < combined.length) {
				setLogOverflowed(true);
			}
			return next;
		});
	}, []);

	const resolvePlayer = useCallback(
		(
			candidate: Pick<SessionPlayerStateSnapshot, 'id' | 'name'> | undefined,
			fallback?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
		) => candidate ?? fallback,
		[],
	);

	const addLog = useCallback(
		(
			entry: string | string[],
			player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
		) => {
			const fallbackPlayerId = sessionSnapshot.game.activePlayerId;
			const fallbackPlayer = sessionSnapshot.game.players.find(
				(candidate) => candidate.id === fallbackPlayerId,
			);
			const logPlayer = resolvePlayer(player, fallbackPlayer);
			if (!logPlayer) {
				return;
			}
			const messages = Array.isArray(entry) ? entry : [entry];
			const items = messages.map<LogEntry>((text) => ({
				id: nextLogIdRef.current++,
				time: new Date().toLocaleTimeString(),
				text: `[${logPlayer.name}] ${text}`,
				playerId: logPlayer.id,
				kind: 'text',
			}));
			appendEntries(items);
		},
		[
			appendEntries,
			resolvePlayer,
			sessionSnapshot.game.activePlayerId,
			sessionSnapshot.game.players,
		],
	);

	const addResolutionLog = useCallback(
		(
			resolution: ActionResolution,
			player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
		) => {
			const fallbackPlayerId = sessionSnapshot.game.activePlayerId;
			const fallbackPlayer = sessionSnapshot.game.players.find(
				(candidate) => candidate.id === fallbackPlayerId,
			);
			const resolvedPlayer = resolvePlayer(
				player ?? resolution.player,
				fallbackPlayer,
			);
			if (!resolvedPlayer) {
				return;
			}
			const resolutionSnapshot = cloneResolution(resolution, resolvedPlayer);
			const shouldAttemptMerge =
				!resolutionSnapshot.requireAcknowledgement &&
				isPhaseSourceDetail(resolutionSnapshot.source);
			let overflowed = false;
			setLog((previous) => {
				if (shouldAttemptMerge) {
					const lastEntry = previous[previous.length - 1];
					if (
						lastEntry &&
						lastEntry.kind === 'resolution' &&
						lastEntry.playerId === resolvedPlayer.id &&
						isPhaseSourceDetail(lastEntry.resolution.source)
					) {
						const previousIdentity = resolvePhaseIdentity(
							lastEntry.resolution.source,
						);
						const nextIdentity = resolvePhaseIdentity(
							resolutionSnapshot.source,
						);
						if (
							previousIdentity &&
							nextIdentity &&
							previousIdentity === nextIdentity
						) {
							const mergedEntry: ResolutionLogEntry = {
								...lastEntry,
								time: new Date().toLocaleTimeString(),
								resolution: resolutionSnapshot,
							};
							return [...previous.slice(0, -1), mergedEntry];
						}
					}
				}
				const entry: LogEntry = {
					id: nextLogIdRef.current++,
					time: new Date().toLocaleTimeString(),
					playerId: resolvedPlayer.id,
					kind: 'resolution',
					resolution: resolutionSnapshot,
				};
				const combined = [...previous, entry];
				const next = combined.slice(-MAX_LOG_ENTRIES);
				if (next.length < combined.length) {
					overflowed = true;
				}
				return next;
			});
			if (overflowed) {
				setLogOverflowed(true);
			}
		},
		[
			resolvePlayer,
			sessionSnapshot.game.activePlayerId,
			sessionSnapshot.game.players,
			setLog,
			setLogOverflowed,
		],
	);

	return { log, logOverflowed, addLog, addResolutionLog };
}

export type { LogEntry, ResolutionLogEntry, TextLogEntry };
export { ACTION_EFFECT_DELAY, MAX_LOG_ENTRIES };
