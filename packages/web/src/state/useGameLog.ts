import { useCallback, useRef, useState } from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { ActionResolution } from './useActionResolution';
import {
	isPhaseSourceDetail,
	resolvePhaseIdentity,
} from './useActionResolution.helpers';

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
			let merged = false;
			setLog((previous) => {
				const lastEntry = previous[previous.length - 1];
				if (
					lastEntry?.kind === 'resolution' &&
					isPhaseSourceDetail(lastEntry.resolution.source) &&
					isPhaseSourceDetail(resolutionSnapshot.source)
				) {
					const previousIdentity = resolvePhaseIdentity(
						lastEntry.resolution.source,
					);
					const nextIdentity = resolvePhaseIdentity(resolutionSnapshot.source);
					if (
						previousIdentity &&
						nextIdentity &&
						previousIdentity === nextIdentity
					) {
						const updatedEntry: ResolutionLogEntry = {
							...lastEntry,
							playerId: resolvedPlayer.id,
							resolution: resolutionSnapshot,
						};
						merged = true;
						return [...previous.slice(0, -1), updatedEntry];
					}
				}
				return previous;
			});
			if (merged) {
				return;
			}
			const entry: LogEntry = {
				id: nextLogIdRef.current++,
				time: new Date().toLocaleTimeString(),
				playerId: resolvedPlayer.id,
				kind: 'resolution',
				resolution: resolutionSnapshot,
			};
			appendEntries([entry]);
		},
		[
			appendEntries,
			resolvePlayer,
			sessionSnapshot.game.activePlayerId,
			sessionSnapshot.game.players,
		],
	);

	return { log, logOverflowed, addLog, addResolutionLog };
}

export type { LogEntry, ResolutionLogEntry, TextLogEntry };
export { ACTION_EFFECT_DELAY, MAX_LOG_ENTRIES };
