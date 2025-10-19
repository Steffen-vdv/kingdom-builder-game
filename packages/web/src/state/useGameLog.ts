import { useCallback, useRef, useState } from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { ActionResolution, ResolutionSource } from './useActionResolution';

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

function isPhaseSourceDetail(
	source: ResolutionSource,
): source is Extract<ResolutionSource, { kind: 'phase' }> {
	return typeof source !== 'string' && source.kind === 'phase';
}

function resolvePhaseIdentity(
	source: Extract<ResolutionSource, { kind: 'phase' }>,
) {
	const id = source.id?.trim();
	if (id && id.length > 0) {
		return id;
	}
	const label = source.label?.trim();
	return label && label.length > 0 ? label : null;
}

function shouldMergePhaseResolution(
	previous: ResolutionLogEntry,
	nextResolution: ActionResolution,
	playerId: string,
) {
	if (previous.playerId !== playerId) {
		return false;
	}
	const previousSource = previous.resolution.source;
	const nextSource = nextResolution.source;
	if (
		!isPhaseSourceDetail(previousSource) ||
		!isPhaseSourceDetail(nextSource)
	) {
		return false;
	}
	const previousIdentity = resolvePhaseIdentity(previousSource);
	const nextIdentity = resolvePhaseIdentity(nextSource);
	if (!previousIdentity || !nextIdentity || previousIdentity !== nextIdentity) {
		return false;
	}
	const previousLines = previous.resolution.lines;
	const nextLines = nextResolution.lines;
	if (previousLines.length > nextLines.length) {
		return false;
	}
	for (let index = 0; index < previousLines.length; index += 1) {
		if (previousLines[index] !== nextLines[index]) {
			return false;
		}
	}
	return true;
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
			setLog((previous) => {
				const lastEntry = previous[previous.length - 1];
				if (
					lastEntry &&
					lastEntry.kind === 'resolution' &&
					shouldMergePhaseResolution(
						lastEntry,
						resolutionSnapshot,
						resolvedPlayer.id,
					)
				) {
					const merged: ResolutionLogEntry = {
						...lastEntry,
						time: new Date().toLocaleTimeString(),
						resolution: resolutionSnapshot,
					};
					const next = [...previous];
					next[next.length - 1] = merged;
					return next;
				}
				const entry: LogEntry = {
					id: nextLogIdRef.current++,
					time: new Date().toLocaleTimeString(),
					playerId: resolvedPlayer.id,
					kind: 'resolution',
					resolution: resolutionSnapshot,
				};
				const combined = [...previous, entry];
				const trimmed = combined.slice(-MAX_LOG_ENTRIES);
				if (trimmed.length < combined.length) {
					setLogOverflowed(true);
				}
				return trimmed;
			});
		},
		[
			setLogOverflowed,
			resolvePlayer,
			sessionSnapshot.game.activePlayerId,
			sessionSnapshot.game.players,
		],
	);

	return { log, logOverflowed, addLog, addResolutionLog };
}

export type { LogEntry, ResolutionLogEntry, TextLogEntry };
export { ACTION_EFFECT_DELAY, MAX_LOG_ENTRIES };
