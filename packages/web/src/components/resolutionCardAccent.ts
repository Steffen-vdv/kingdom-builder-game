import { joinClasses } from './common/cardStyles';
import {
	resolvePlayerAccentKey,
	type PlayerAccentKey,
} from '../utils/playerAccent';

interface ResolutionAccentClasses {
	key: PlayerAccentKey;
	card: string;
	section: string;
	badge: string;
}

const CARD_ACCENT_CLASSES: Record<PlayerAccentKey, string> = {
	neutral: '',
	primary: joinClasses(
		'border-blue-300/50',
		'bg-blue-50/80',
		'shadow-[0_24px_54px_rgba(37,99,235,0.22)]',
		'dark:border-blue-300/30',
		'dark:bg-blue-950/50',
		'dark:shadow-[0_28px_54px_rgba(37,99,235,0.38)]',
	),
	secondary: joinClasses(
		'border-rose-300/50',
		'bg-rose-50/80',
		'shadow-[0_24px_54px_rgba(190,18,60,0.22)]',
		'dark:border-rose-300/30',
		'dark:bg-rose-950/50',
		'dark:shadow-[0_28px_54px_rgba(244,63,94,0.38)]',
	),
};

const RESOLUTION_SECTION_ACCENT_CLASSES: Record<PlayerAccentKey, string> = {
	neutral: '',
	primary: joinClasses(
		'border-blue-200/50',
		'bg-blue-100/70',
		'shadow-[inset_0_8px_24px_rgba(37,99,235,0.22)]',
		'ring-blue-200/40',
		'dark:border-blue-300/20',
		'dark:bg-blue-950/40',
		'dark:shadow-[inset_0_10px_28px_rgba(37,99,235,0.35)]',
		'dark:ring-blue-300/20',
	),
	secondary: joinClasses(
		'border-rose-200/50',
		'bg-rose-100/70',
		'shadow-[inset_0_8px_24px_rgba(190,18,60,0.22)]',
		'ring-rose-200/40',
		'dark:border-rose-300/20',
		'dark:bg-rose-950/40',
		'dark:shadow-[inset_0_10px_28px_rgba(244,63,94,0.35)]',
		'dark:ring-rose-300/20',
	),
};

const ACTION_BADGE_ACCENT_CLASSES: Record<PlayerAccentKey, string> = {
	neutral: '',
	primary: joinClasses(
		'border-blue-200/60',
		'bg-blue-100/70',
		'dark:border-blue-300/30',
		'dark:bg-blue-900/40',
	),
	secondary: joinClasses(
		'border-rose-200/60',
		'bg-rose-100/70',
		'dark:border-rose-300/30',
		'dark:bg-rose-900/40',
	),
};

function resolveResolutionAccents(
	players: readonly { id: string }[],
	playerId: string | null | undefined,
): ResolutionAccentClasses {
	const key = resolvePlayerAccentKey(players, playerId);
	return {
		key,
		card: CARD_ACCENT_CLASSES[key],
		section: RESOLUTION_SECTION_ACCENT_CLASSES[key],
		badge: ACTION_BADGE_ACCENT_CLASSES[key],
	};
}

export type { ResolutionAccentClasses };
export { resolveResolutionAccents };
