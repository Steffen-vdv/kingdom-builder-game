import { useCallback, useMemo } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { useGameEngine } from '../../state/GameContext';
import { joinClasses } from './cardStyles';

type PlayerAccentVariant = 'neutral' | 'playerA' | 'playerB';

interface PlayerAccentClasses {
	outer: string;
	card: string;
	inner: string;
	headerLabel: string;
	primaryMarker: string;
}

const PLAYER_ACCENT_STYLES: Record<PlayerAccentVariant, PlayerAccentClasses> = {
	neutral: {
		outer: joinClasses(
			'border-slate-300/40',
			'shadow-[0_18px_48px_rgba(15,23,42,0.18)]',
			'dark:border-slate-500/40',
			'dark:shadow-[0_24px_48px_rgba(15,23,42,0.4)]',
		),
		card: '',
		inner: joinClasses('shadow-amber-500/10', 'dark:shadow-slate-900/40'),
		headerLabel: 'text-amber-600 dark:text-amber-300',
		primaryMarker: joinClasses(
			'bg-amber-500',
			'shadow-[0_0_0_4px_rgba(251,191,36,0.25)]',
			'dark:bg-amber-400',
			'dark:shadow-[0_0_0_4px_rgba(251,191,36,0.2)]',
		),
	},
	playerA: {
		outer: joinClasses(
			'border-blue-400/50',
			'shadow-[0_18px_48px_rgba(37,99,235,0.25)]',
			'dark:border-blue-300/40',
			'dark:shadow-[0_24px_54px_rgba(37,99,235,0.35)]',
		),
		card: joinClasses(
			'border-blue-400/60',
			'shadow-[0_28px_60px_rgba(37,99,235,0.28)]',
			'ring-blue-200/50',
			'dark:border-blue-300/50',
			'dark:ring-blue-400/40',
			'dark:shadow-[0_32px_72px_rgba(37,99,235,0.45)]',
		),
		inner: joinClasses(
			'border-blue-300/60',
			'ring-blue-200/40',
			'shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35)]',
			'dark:border-blue-400/40',
			'dark:ring-blue-400/30',
			'dark:shadow-[inset_0_0_0_1px_rgba(96,165,250,0.3)]',
		),
		headerLabel: 'text-blue-600 dark:text-blue-300',
		primaryMarker: joinClasses(
			'bg-blue-500',
			'shadow-[0_0_0_4px_rgba(59,130,246,0.35)]',
			'dark:bg-blue-400',
			'dark:shadow-[0_0_0_4px_rgba(96,165,250,0.35)]',
		),
	},
	playerB: {
		outer: joinClasses(
			'border-rose-400/50',
			'shadow-[0_18px_48px_rgba(190,18,60,0.25)]',
			'dark:border-rose-300/40',
			'dark:shadow-[0_24px_54px_rgba(244,63,94,0.35)]',
		),
		card: joinClasses(
			'border-rose-400/60',
			'shadow-[0_28px_60px_rgba(225,29,72,0.28)]',
			'ring-rose-200/50',
			'dark:border-rose-300/50',
			'dark:ring-rose-400/40',
			'dark:shadow-[0_32px_72px_rgba(225,29,72,0.45)]',
		),
		inner: joinClasses(
			'border-rose-300/60',
			'ring-rose-200/40',
			'shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]',
			'dark:border-rose-400/40',
			'dark:ring-rose-400/30',
			'dark:shadow-[inset_0_0_0_1px_rgba(251,113,133,0.3)]',
		),
		headerLabel: 'text-rose-600 dark:text-rose-300',
		primaryMarker: joinClasses(
			'bg-rose-500',
			'shadow-[0_0_0_4px_rgba(244,63,94,0.35)]',
			'dark:bg-rose-400',
			'dark:shadow-[0_0_0_4px_rgba(251,113,133,0.35)]',
		),
	},
};

function resolvePlayerAccentVariant(
	players: SessionSnapshot['game']['players'],
	playerId: string | null | undefined,
): PlayerAccentVariant {
	if (!playerId) {
		return 'neutral';
	}
	const index = players.findIndex((player) => player.id === playerId);
	if (index === 0) {
		return 'playerA';
	}
	if (index === 1) {
		return 'playerB';
	}
	return 'neutral';
}

function usePlayerAccentResolver() {
	const { sessionSnapshot } = useGameEngine();
	const players = sessionSnapshot.game.players;
	return useCallback(
		(playerId: string | null | undefined) => {
			const variant = resolvePlayerAccentVariant(players, playerId);
			return PLAYER_ACCENT_STYLES[variant];
		},
		[players],
	);
}

function usePlayerAccent(playerId: string | null | undefined) {
	const resolveAccent = usePlayerAccentResolver();
	return useMemo(
		() => resolveAccent(playerId ?? null),
		[playerId, resolveAccent],
	);
}

export type { PlayerAccentClasses };
export {
	usePlayerAccent,
	usePlayerAccentResolver,
	resolvePlayerAccentVariant,
	PLAYER_ACCENT_STYLES,
};
