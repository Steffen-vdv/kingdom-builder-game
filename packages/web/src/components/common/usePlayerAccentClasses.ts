import { useCallback } from 'react';
import { useGameEngine } from '../../state/GameContext';
import { joinClasses } from './cardStyles';

interface PlayerAccentPalette {
	card: string;
	resolutionSurface: string;
	timelineRail: string;
	primaryMarker: string;
	nestedMarker: string;
	headerLabel: string;
	logSurface: string;
	actionBadge: string;
}

const DEFAULT_ACCENT: PlayerAccentPalette = {
	card: '',
	resolutionSurface: 'shadow-amber-500/10',
	timelineRail: 'bg-white/30 dark:bg-white/10',
	primaryMarker: joinClasses(
		'bg-amber-500',
		'shadow-[0_0_0_4px_rgba(251,191,36,0.25)]',
		'dark:bg-amber-400',
		'dark:shadow-[0_0_0_4px_rgba(251,191,36,0.2)]',
	),
	nestedMarker: joinClasses(
		'bg-slate-400/80',
		'shadow-[0_0_0_4px_rgba(148,163,184,0.2)]',
		'dark:bg-slate-500',
		'dark:shadow-[0_0_0_4px_rgba(15,23,42,0.45)]',
	),
	headerLabel: 'text-amber-600 dark:text-amber-300',
	logSurface: joinClasses(
		'border-slate-300/40',
		'shadow-[0_18px_48px_rgba(15,23,42,0.18)]',
		'dark:border-slate-500/40',
		'dark:shadow-[0_24px_48px_rgba(15,23,42,0.4)]',
	),
	actionBadge: joinClasses(
		'border border-white/50',
		'bg-white/70',
		'shadow-amber-500/20',
		'dark:border-white/10',
		'dark:bg-slate-900/60',
		'dark:shadow-slate-900/40',
	),
};

const PLAYER_ONE_ACCENT: PlayerAccentPalette = {
	card: joinClasses(
		'border-blue-400/60',
		'bg-blue-50/90',
		'ring-1',
		'ring-blue-400/30',
		'dark:border-blue-300/50',
		'dark:bg-blue-950/40',
		'dark:ring-blue-400/20',
	),
	resolutionSurface: joinClasses(
		'border-blue-200/60',
		'bg-blue-50/70',
		'ring-blue-400/25',
		'dark:border-blue-900/40',
		'dark:bg-blue-950/30',
		'dark:ring-blue-400/20',
	),
	timelineRail: 'bg-blue-400/30 dark:bg-blue-400/20',
	primaryMarker: joinClasses(
		'bg-blue-500',
		'shadow-[0_0_0_4px_rgba(59,130,246,0.25)]',
		'dark:bg-blue-400',
		'dark:shadow-[0_0_0_4px_rgba(59,130,246,0.2)]',
	),
	nestedMarker: joinClasses(
		'bg-blue-300/80',
		'shadow-[0_0_0_4px_rgba(59,130,246,0.18)]',
		'dark:bg-blue-500/60',
		'dark:shadow-[0_0_0_4px_rgba(30,64,175,0.35)]',
	),
	headerLabel: 'text-blue-600 dark:text-blue-300',
	logSurface: joinClasses(
		'border-blue-400/50',
		'shadow-[0_18px_48px_rgba(37,99,235,0.25)]',
		'dark:border-blue-300/40',
		'dark:shadow-[0_24px_54px_rgba(37,99,235,0.35)]',
	),
	actionBadge: joinClasses(
		'border border-blue-200/60',
		'bg-blue-50/80',
		'ring-1 ring-blue-400/30',
		'dark:border-blue-900/40',
		'dark:bg-blue-950/35',
		'dark:ring-blue-400/20',
	),
};

const PLAYER_TWO_ACCENT: PlayerAccentPalette = {
	card: joinClasses(
		'border-rose-400/60',
		'bg-rose-50/90',
		'ring-1',
		'ring-rose-400/30',
		'dark:border-rose-300/50',
		'dark:bg-rose-950/40',
		'dark:ring-rose-400/20',
	),
	resolutionSurface: joinClasses(
		'border-rose-200/60',
		'bg-rose-50/70',
		'ring-rose-400/25',
		'dark:border-rose-900/40',
		'dark:bg-rose-950/30',
		'dark:ring-rose-400/20',
	),
	timelineRail: 'bg-rose-400/30 dark:bg-rose-300/25',
	primaryMarker: joinClasses(
		'bg-rose-500',
		'shadow-[0_0_0_4px_rgba(244,63,94,0.25)]',
		'dark:bg-rose-400',
		'dark:shadow-[0_0_0_4px_rgba(244,63,94,0.22)]',
	),
	nestedMarker: joinClasses(
		'bg-rose-300/80',
		'shadow-[0_0_0_4px_rgba(244,114,182,0.22)]',
		'dark:bg-rose-500/60',
		'dark:shadow-[0_0_0_4px_rgba(159,18,57,0.35)]',
	),
	headerLabel: 'text-rose-600 dark:text-rose-300',
	logSurface: joinClasses(
		'border-rose-400/50',
		'shadow-[0_18px_48px_rgba(190,18,60,0.25)]',
		'dark:border-rose-300/40',
		'dark:shadow-[0_24px_54px_rgba(244,63,94,0.35)]',
	),
	actionBadge: joinClasses(
		'border border-rose-200/60',
		'bg-rose-50/80',
		'ring-1 ring-rose-400/30',
		'dark:border-rose-900/40',
		'dark:bg-rose-950/35',
		'dark:ring-rose-400/20',
	),
};

function usePlayerAccentClasses() {
	const { sessionSnapshot } = useGameEngine();
	const [playerA, playerB] = sessionSnapshot.game.players;

	return useCallback(
		(playerId: string | null | undefined): PlayerAccentPalette => {
			if (playerA && playerId === playerA.id) {
				return PLAYER_ONE_ACCENT;
			}
			if (playerB && playerId === playerB.id) {
				return PLAYER_TWO_ACCENT;
			}
			return DEFAULT_ACCENT;
		},
		[playerA, playerB],
	);
}

export type { PlayerAccentPalette };
export { usePlayerAccentClasses };
