import { useCallback } from 'react';
import { useOptionalGameEngine } from '../../state/GameContext';
import { joinClasses } from './cardStyles';

type PlayerAccentVariant = 'primary' | 'secondary' | 'neutral';

interface PlayerAccentClasses {
	variant: PlayerAccentVariant;
	cardClass: string | null;
	cardSurfaceClass: string | null;
	logClass: string;
}

interface PlayerSummary {
	id: string;
}

const PLAYER_ACCENT_CLASS_MAP: Record<
	PlayerAccentVariant,
	PlayerAccentClasses
> = {
	primary: {
		variant: 'primary',
		cardClass: joinClasses(
			'bg-blue-500/10',
			'border-blue-400/40',
			'shadow-[0_18px_48px_rgba(37,99,235,0.22)]',
			'dark:bg-blue-500/20',
			'dark:border-blue-300/40',
			'dark:shadow-[0_24px_54px_rgba(37,99,235,0.3)]',
		),
		cardSurfaceClass: joinClasses(
			'bg-blue-500/10',
			'border-blue-400/40',
			'ring-blue-400/30',
			'dark:bg-blue-500/20',
			'dark:border-blue-300/40',
			'dark:ring-blue-300/30',
		),
		logClass: joinClasses(
			'border-blue-400/50',
			'shadow-[0_18px_48px_rgba(37,99,235,0.25)]',
			'dark:border-blue-300/40',
			'dark:shadow-[0_24px_54px_rgba(37,99,235,0.35)]',
		),
	},
	secondary: {
		variant: 'secondary',
		cardClass: joinClasses(
			'bg-rose-500/10',
			'border-rose-400/40',
			'shadow-[0_18px_48px_rgba(244,63,94,0.22)]',
			'dark:bg-rose-500/20',
			'dark:border-rose-300/40',
			'dark:shadow-[0_24px_54px_rgba(244,63,94,0.32)]',
		),
		cardSurfaceClass: joinClasses(
			'bg-rose-500/10',
			'border-rose-400/40',
			'ring-rose-400/30',
			'dark:bg-rose-500/20',
			'dark:border-rose-300/40',
			'dark:ring-rose-300/30',
		),
		logClass: joinClasses(
			'border-rose-400/50',
			'shadow-[0_18px_48px_rgba(190,18,60,0.25)]',
			'dark:border-rose-300/40',
			'dark:shadow-[0_24px_54px_rgba(244,63,94,0.35)]',
		),
	},
	neutral: {
		variant: 'neutral',
		cardClass: null,
		cardSurfaceClass: null,
		logClass: joinClasses(
			'border-slate-300/40',
			'shadow-[0_18px_48px_rgba(15,23,42,0.18)]',
			'dark:border-slate-500/40',
			'dark:shadow-[0_24px_48px_rgba(15,23,42,0.4)]',
		),
	},
};

function resolveAccentVariant(
	playerId: string | null | undefined,
	players: PlayerSummary[],
): PlayerAccentVariant {
	if (!playerId) {
		return 'neutral';
	}
	const [primary, secondary] = players;
	if (primary && playerId === primary.id) {
		return 'primary';
	}
	if (secondary && playerId === secondary.id) {
		return 'secondary';
	}
	return 'neutral';
}

function usePlayerAccentResolver() {
	const game = useOptionalGameEngine();
	const players = (game?.sessionSnapshot.game.players ?? []) as PlayerSummary[];

	return useCallback(
		(playerId: string | null | undefined): PlayerAccentClasses => {
			const variant = resolveAccentVariant(playerId, players);
			return PLAYER_ACCENT_CLASS_MAP[variant];
		},
		[players],
	);
}

export type { PlayerAccentClasses };
export { usePlayerAccentResolver };
