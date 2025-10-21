import { useCallback } from 'react';
import { useOptionalGameEngine } from '../../state/GameContext';

interface PlayerAccentClassSet {
	card: string;
	log: string;
}

const DEFAULT_ACCENT: PlayerAccentClassSet = {
	card: '',
	log: [
		'border-slate-300/40',
		'shadow-[0_18px_48px_rgba(15,23,42,0.18)]',
		'dark:border-slate-500/40',
		'dark:shadow-[0_24px_48px_rgba(15,23,42,0.4)]',
	].join(' '),
};

const PRIMARY_ACCENT: PlayerAccentClassSet = {
	card: [
		'border-blue-300/60',
		'bg-gradient-to-br',
		'from-blue-50/95',
		'via-blue-50/80',
		'to-blue-100/70',
		'shadow-[0_18px_48px_rgba(37,99,235,0.25)]',
		'dark:border-blue-300/40',
		'dark:from-blue-900/60',
		'dark:via-blue-900/50',
		'dark:to-blue-950/40',
		'dark:shadow-[0_24px_54px_rgba(37,99,235,0.35)]',
	].join(' '),
	log: [
		'border-blue-400/50',
		'shadow-[0_18px_48px_rgba(37,99,235,0.25)]',
		'dark:border-blue-300/40',
		'dark:shadow-[0_24px_54px_rgba(37,99,235,0.35)]',
	].join(' '),
};

const SECONDARY_ACCENT: PlayerAccentClassSet = {
	card: [
		'border-rose-300/60',
		'bg-gradient-to-br',
		'from-rose-50/95',
		'via-rose-50/80',
		'to-rose-100/70',
		'shadow-[0_18px_48px_rgba(190,18,60,0.25)]',
		'dark:border-rose-300/40',
		'dark:from-rose-900/60',
		'dark:via-rose-900/50',
		'dark:to-rose-950/40',
		'dark:shadow-[0_24px_54px_rgba(244,63,94,0.35)]',
	].join(' '),
	log: [
		'border-rose-400/50',
		'shadow-[0_18px_48px_rgba(190,18,60,0.25)]',
		'dark:border-rose-300/40',
		'dark:shadow-[0_24px_54px_rgba(244,63,94,0.35)]',
	].join(' '),
};

function usePlayerAccentClasses() {
	const gameEngine = useOptionalGameEngine();
	const players = gameEngine?.sessionSnapshot.game.players ?? [];
	const playerAId = players[0]?.id ?? null;
	const playerBId = players[1]?.id ?? null;

	return useCallback(
		(playerId: string | null | undefined): PlayerAccentClassSet => {
			if (playerId && playerAId && playerId === playerAId) {
				return PRIMARY_ACCENT;
			}
			if (playerId && playerBId && playerId === playerBId) {
				return SECONDARY_ACCENT;
			}
			return DEFAULT_ACCENT;
		},
		[playerAId, playerBId],
	);
}

export type { PlayerAccentClassSet };
export { usePlayerAccentClasses };
