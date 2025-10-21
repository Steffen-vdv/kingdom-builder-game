import clsx from 'clsx';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';

type PlayerAccentTone = 'first' | 'second' | 'neutral';

const LOG_ACCENT_CLASSES: Record<PlayerAccentTone, string> = {
	first: clsx(
		'border-blue-400/50',
		'shadow-[0_18px_48px_rgba(37,99,235,0.25)]',
		'dark:border-blue-300/40',
		'dark:shadow-[0_24px_54px_rgba(37,99,235,0.35)]',
	),
	second: clsx(
		'border-rose-400/50',
		'shadow-[0_18px_48px_rgba(190,18,60,0.25)]',
		'dark:border-rose-300/40',
		'dark:shadow-[0_24px_54px_rgba(244,63,94,0.35)]',
	),
	neutral: clsx(
		'border-slate-300/40',
		'shadow-[0_18px_48px_rgba(15,23,42,0.18)]',
		'dark:border-slate-500/40',
		'dark:shadow-[0_24px_48px_rgba(15,23,42,0.4)]',
	),
};

const CARD_ACCENT_CLASSES: Record<PlayerAccentTone, string> = {
	first: clsx(
		'bg-blue-500/10',
		'border-blue-400/50',
		'shadow-[0_18px_48px_rgba(37,99,235,0.25)]',
		'dark:bg-blue-500/15',
		'dark:border-blue-300/40',
		'dark:shadow-[0_24px_54px_rgba(37,99,235,0.35)]',
	),
	second: clsx(
		'bg-rose-500/10',
		'border-rose-400/50',
		'shadow-[0_18px_48px_rgba(190,18,60,0.25)]',
		'dark:bg-rose-500/15',
		'dark:border-rose-300/40',
		'dark:shadow-[0_24px_54px_rgba(244,63,94,0.35)]',
	),
	neutral: clsx(
		'bg-white/80',
		'border-white/60',
		'shadow-amber-500/10',
		'dark:bg-slate-900/80',
		'dark:border-white/10',
		'dark:shadow-slate-900/60',
	),
};

function resolvePlayerAccentTone(
	players: SessionPlayerStateSnapshot[],
	playerId: string | undefined,
): PlayerAccentTone {
	if (!playerId) {
		return 'neutral';
	}
	const index = players.findIndex((player) => player.id === playerId);
	if (index === 0) {
		return 'first';
	}
	if (index === 1) {
		return 'second';
	}
	return 'neutral';
}

function getLogAccentClass(
	players: SessionPlayerStateSnapshot[],
	playerId: string | undefined,
) {
	const tone = resolvePlayerAccentTone(players, playerId);
	return LOG_ACCENT_CLASSES[tone];
}

function getCardAccentClass(
	players: SessionPlayerStateSnapshot[],
	playerId: string | undefined,
) {
	const tone = resolvePlayerAccentTone(players, playerId);
	return CARD_ACCENT_CLASSES[tone];
}

export type { PlayerAccentTone };
export { getCardAccentClass, getLogAccentClass, resolvePlayerAccentTone };
