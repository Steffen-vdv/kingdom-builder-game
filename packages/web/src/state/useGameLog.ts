import { useCallback, useRef, useState } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol';

const ACTION_EFFECT_DELAY = 600;
const MAX_LOG_ENTRIES = 250;

type LogEntry = {
	id: number;
	time: string;
	text: string;
	playerId: string;
};

type SessionPlayerSnapshot = SessionSnapshot['game']['players'][number];

interface GameLogOptions {
	sessionState: SessionSnapshot;
}

export function useGameLog({ sessionState }: GameLogOptions) {
	const [log, setLog] = useState<LogEntry[]>([]);
	const [logOverflowed, setLogOverflowed] = useState(false);
	const nextLogIdRef = useRef(0);

	const addLog = useCallback(
		(
			entry: string | string[],
			player?: Pick<SessionPlayerSnapshot, 'id' | 'name'>,
		) => {
			const fallbackPlayerId = sessionState.game.activePlayerId;
			const fallbackPlayer = sessionState.game.players.find(
				(candidate) => candidate.id === fallbackPlayerId,
			);
			const logPlayer = player ?? fallbackPlayer;
			if (!logPlayer) {
				return;
			}
			setLog((prev) => {
				const messages = Array.isArray(entry) ? entry : [entry];
				const items = messages.map((text) => ({
					id: nextLogIdRef.current++,
					time: new Date().toLocaleTimeString(),
					text: `[${logPlayer.name}] ${text}`,
					playerId: logPlayer.id,
				}));
				const combined = [...prev, ...items];
				const next = combined.slice(-MAX_LOG_ENTRIES);
				if (next.length < combined.length) {
					setLogOverflowed(true);
				}
				return next;
			});
		},
		[sessionState.game.activePlayerId, sessionState.game.players],
	);

	return { log, logOverflowed, addLog };
}

export type { LogEntry };
export { ACTION_EFFECT_DELAY, MAX_LOG_ENTRIES };
