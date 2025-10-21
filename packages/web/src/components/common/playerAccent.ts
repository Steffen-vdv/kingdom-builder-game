import { useMemo } from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import { useOptionalGameEngine } from '../../state/GameContext';

interface PlayerAccentTheme {
	container: string;
	headerLabel: string;
	actionBadge: string;
	resolution: string;
	timelineRail: string;
	primaryMarker: string;
	nestedMarker: string;
}

const NEUTRAL_ACCENT: PlayerAccentTheme = {
	container: [
		'border-slate-300/40',
		'shadow-[0_18px_48px_rgba(15,23,42,0.18)]',
		'dark:border-slate-500/40',
		'dark:shadow-[0_24px_48px_rgba(15,23,42,0.4)]',
	].join(' '),
	headerLabel: 'text-amber-600 dark:text-amber-300',
	actionBadge: '',
	resolution: [
		'border-white/50',
		'bg-white/70',
		'shadow-amber-500/10',
		'ring-white/30',
		'dark:border-white/10',
		'dark:bg-slate-900/60',
		'dark:shadow-slate-900/40',
		'dark:ring-white/10',
	].join(' '),
	timelineRail: 'bg-white/30 dark:bg-white/10',
	primaryMarker: [
		'bg-amber-500',
		'shadow-[0_0_0_4px_rgba(251,191,36,0.25)]',
		'dark:bg-amber-400',
		'dark:shadow-[0_0_0_4px_rgba(251,191,36,0.2)]',
	].join(' '),
	nestedMarker: [
		'bg-slate-400/80',
		'shadow-[0_0_0_4px_rgba(148,163,184,0.2)]',
		'dark:bg-slate-500',
		'dark:shadow-[0_0_0_4px_rgba(15,23,42,0.45)]',
	].join(' '),
};

const PLAYER_A_ACCENT: PlayerAccentTheme = {
	container: [
		'border-blue-400/50',
		'shadow-[0_18px_48px_rgba(37,99,235,0.25)]',
		'dark:border-blue-300/40',
		'dark:shadow-[0_24px_54px_rgba(37,99,235,0.35)]',
	].join(' '),
	headerLabel: 'text-blue-700 dark:text-blue-300',
	actionBadge: [
		'border-blue-300/70',
		'bg-blue-50/80',
		'shadow-[inset_0_2px_6px_rgba(59,130,246,0.2)]',
		'text-blue-900',
		'dark:border-blue-400/50',
		'dark:bg-blue-500/20',
		'dark:text-blue-100',
		'dark:shadow-[inset_0_2px_6px_rgba(37,99,235,0.4)]',
	].join(' '),
	resolution: [
		'border-blue-300/60',
		'shadow-[inset_0_1px_2px_rgba(37,99,235,0.2)]',
		'ring-blue-300/30',
		'dark:border-blue-400/30',
		'dark:shadow-[inset_0_1px_2px_rgba(37,99,235,0.35)]',
		'dark:ring-blue-400/20',
	].join(' '),
	timelineRail: 'bg-blue-400/30 dark:bg-blue-400/20',
	primaryMarker: [
		'bg-blue-500',
		'shadow-[0_0_0_4px_rgba(59,130,246,0.35)]',
		'dark:bg-blue-400',
		'dark:shadow-[0_0_0_4px_rgba(37,99,235,0.4)]',
	].join(' '),
	nestedMarker: [
		'bg-blue-400/80',
		'shadow-[0_0_0_4px_rgba(96,165,250,0.28)]',
		'dark:bg-blue-400/70',
		'dark:shadow-[0_0_0_4px_rgba(37,99,235,0.35)]',
	].join(' '),
};

const PLAYER_B_ACCENT: PlayerAccentTheme = {
	container: [
		'border-rose-400/50',
		'shadow-[0_18px_48px_rgba(190,18,60,0.25)]',
		'dark:border-rose-300/40',
		'dark:shadow-[0_24px_54px_rgba(244,63,94,0.35)]',
	].join(' '),
	headerLabel: 'text-rose-600 dark:text-rose-300',
	actionBadge: [
		'border-rose-300/70',
		'bg-rose-50/80',
		'shadow-[inset_0_2px_6px_rgba(244,63,94,0.25)]',
		'text-rose-900',
		'dark:border-rose-400/50',
		'dark:bg-rose-500/20',
		'dark:text-rose-100',
		'dark:shadow-[inset_0_2px_6px_rgba(225,29,72,0.45)]',
	].join(' '),
	resolution: [
		'border-rose-300/60',
		'shadow-[inset_0_1px_2px_rgba(244,63,94,0.25)]',
		'ring-rose-300/30',
		'dark:border-rose-400/30',
		'dark:shadow-[inset_0_1px_2px_rgba(225,29,72,0.45)]',
		'dark:ring-rose-400/20',
	].join(' '),
	timelineRail: 'bg-rose-400/30 dark:bg-rose-400/20',
	primaryMarker: [
		'bg-rose-500',
		'shadow-[0_0_0_4px_rgba(244,63,94,0.35)]',
		'dark:bg-rose-400',
		'dark:shadow-[0_0_0_4px_rgba(225,29,72,0.4)]',
	].join(' '),
	nestedMarker: [
		'bg-rose-400/80',
		'shadow-[0_0_0_4px_rgba(251,113,133,0.28)]',
		'dark:bg-rose-400/70',
		'dark:shadow-[0_0_0_4px_rgba(225,29,72,0.35)]',
	].join(' '),
};

type MinimalPlayer = Pick<SessionPlayerStateSnapshot, 'id'>;
const EMPTY_PLAYERS: MinimalPlayer[] = [];

function resolvePlayerAccentTheme(
	players: readonly MinimalPlayer[],
	playerId: string | null | undefined,
): PlayerAccentTheme {
	if (!playerId) {
		return NEUTRAL_ACCENT;
	}
	for (const [index, player] of players.entries()) {
		if (player.id === playerId) {
			return index === 0
				? PLAYER_A_ACCENT
				: index === 1
					? PLAYER_B_ACCENT
					: NEUTRAL_ACCENT;
		}
	}
	return NEUTRAL_ACCENT;
}

function usePlayerAccentTheme(playerId: string | null | undefined) {
	const context = useOptionalGameEngine();
	const players = context?.sessionSnapshot.game.players ?? EMPTY_PLAYERS;
	return useMemo(
		() => resolvePlayerAccentTheme(players, playerId),
		[players, playerId],
	);
}

export type { PlayerAccentTheme };
export { resolvePlayerAccentTheme, usePlayerAccentTheme };
