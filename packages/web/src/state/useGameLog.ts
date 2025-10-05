import { useCallback, useState } from 'react';
import type {
	EngineSessionSnapshot,
	PlayerStateSnapshot,
} from '@kingdom-builder/engine';

const ACTION_EFFECT_DELAY = 600;
const MAX_LOG_ENTRIES = 250;

type LogEntry = {
	time: string;
	text: string;
	playerId: string;
};

interface GameLogOptions {
	sessionState: EngineSessionSnapshot;
	mountedRef: React.MutableRefObject<boolean>;
	timeScaleRef: React.MutableRefObject<number>;
	setTrackedTimeout: (callback: () => void, delay: number) => number;
}

export function useGameLog({
	sessionState,
	mountedRef,
	timeScaleRef,
	setTrackedTimeout,
}: GameLogOptions) {
	const [log, setLog] = useState<LogEntry[]>([]);
	const [logOverflowed, setLogOverflowed] = useState(false);

	const addLog = useCallback(
		(
			entry: string | string[],
			player?: Pick<PlayerStateSnapshot, 'id' | 'name'>,
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

	const waitWithScale = useCallback(
		(base: number) => {
			const scale = timeScaleRef.current || 1;
			const duration = base / scale;
			if (duration <= 0) {
				return Promise.resolve();
			}
			return new Promise<void>((resolve) => {
				setTrackedTimeout(() => resolve(), duration);
			});
		},
		[setTrackedTimeout, timeScaleRef],
	);

	const logWithEffectDelay = useCallback(
		async (
			lines: string[],
			player: Pick<PlayerStateSnapshot, 'id' | 'name'>,
		) => {
			if (!lines.length) {
				return;
			}
			const [first, ...rest] = lines;
			if (first === undefined) {
				return;
			}
			if (!mountedRef.current) {
				return;
			}
			addLog(first, player);
			for (const line of rest) {
				await waitWithScale(ACTION_EFFECT_DELAY);
				if (!mountedRef.current) {
					return;
				}
				addLog(line, player);
			}
		},
		[addLog, mountedRef, waitWithScale],
	);

	return { log, logOverflowed, addLog, logWithEffectDelay };
}

export type { LogEntry };
export { ACTION_EFFECT_DELAY, MAX_LOG_ENTRIES };
