import {
	advance,
	performAction,
	type ActionParams,
	type EngineContext,
	type PlayerId,
} from '@kingdom-builder/engine';
import type { LogEntry } from './types';

const STORAGE_KEY = 'kingdom-builder:save-state';
const STORAGE_VERSION = 1;

interface SavedActionEvent {
	type: 'action';
	playerId: PlayerId;
	actionId: string;
	params?: Record<string, unknown>;
}

interface SavedEndTurnEvent {
	type: 'end-turn';
	playerId: PlayerId;
}

export type SavedGameEvent = SavedActionEvent | SavedEndTurnEvent;

export interface SavedGame {
	version: typeof STORAGE_VERSION;
	events: SavedGameEvent[];
	turn: number;
	nextPlayerId: PlayerId;
	log: LogEntry[];
	logOverflowed: boolean;
	devMode: boolean;
}

export interface SavedGameMeta {
	turn: number;
	nextPlayerId: PlayerId;
	devMode: boolean;
}

function parseStoredGame(value: string | null): SavedGame | null {
	if (!value) {
		return null;
	}
	try {
		const parsed = JSON.parse(value) as SavedGame;
		if (!parsed || parsed.version !== STORAGE_VERSION) {
			return null;
		}
		return parsed;
	} catch (error) {
		console.warn('Failed to parse saved game', error);
		return null;
	}
}

export function loadSavedGame(): SavedGame | null {
	if (typeof window === 'undefined') {
		return null;
	}
	return parseStoredGame(window.localStorage.getItem(STORAGE_KEY));
}

export function loadSavedGameMeta(): SavedGameMeta | null {
	const save = loadSavedGame();
	if (!save) {
		return null;
	}
	return {
		turn: save.turn,
		nextPlayerId: save.nextPlayerId,
		devMode: save.devMode,
	};
}

export function saveGame(save: SavedGame): void {
	if (typeof window === 'undefined') {
		return;
	}
	const payload = JSON.stringify(save);
	window.localStorage.setItem(STORAGE_KEY, payload);
}

export function clearSavedGame(): void {
	if (typeof window === 'undefined') {
		return;
	}
	window.localStorage.removeItem(STORAGE_KEY);
}

export function replaySavedGame(ctx: EngineContext, save: SavedGame): void {
	for (const event of save.events) {
		if (event.type === 'action') {
			const activePlayerId = ctx.activePlayer.id;
			if (activePlayerId !== event.playerId) {
				const message = [
					'Saved history mismatch:',
					`expected player ${event.playerId}`,
					`but active player is ${activePlayerId}`,
				].join(' ');
				throw new Error(message);
			}
			const actionParams = event.params as ActionParams<string>;
			performAction(event.actionId, ctx, actionParams);
		} else {
			const activePlayerId = ctx.activePlayer.id;
			if (activePlayerId !== event.playerId) {
				const message = [
					'Saved history mismatch:',
					`expected player ${event.playerId} to end turn`,
					`but active player is ${activePlayerId}`,
				].join(' ');
				throw new Error(message);
			}
			advance(ctx);
			while (!ctx.phases[ctx.game.phaseIndex]?.action) {
				advance(ctx);
			}
		}
	}
}
