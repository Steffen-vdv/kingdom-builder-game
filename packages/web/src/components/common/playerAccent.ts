import { joinClasses } from './cardStyles';

const PLAYER_ONE_ACCENT_CLASS = joinClasses(
	'border-blue-400/50',
	'shadow-[0_18px_48px_rgba(37,99,235,0.25)]',
	'dark:border-blue-300/40',
	'dark:shadow-[0_24px_54px_rgba(37,99,235,0.35)]',
);

const PLAYER_TWO_ACCENT_CLASS = joinClasses(
	'border-rose-400/50',
	'shadow-[0_18px_48px_rgba(190,18,60,0.25)]',
	'dark:border-rose-300/40',
	'dark:shadow-[0_24px_54px_rgba(244,63,94,0.35)]',
);

const NEUTRAL_ACCENT_CLASS = joinClasses(
	'border-slate-300/40',
	'shadow-[0_18px_48px_rgba(15,23,42,0.18)]',
	'dark:border-slate-500/40',
	'dark:shadow-[0_24px_48px_rgba(15,23,42,0.4)]',
);

type PlayerReference = { id?: string | null } | null | undefined;

function resolvePlayerAccentClass(
	playerId: string | null | undefined,
	players: PlayerReference[],
) {
	if (!playerId) {
		return NEUTRAL_ACCENT_CLASS;
	}
	const [firstPlayer, secondPlayer] = players;
	if (firstPlayer?.id && firstPlayer.id === playerId) {
		return PLAYER_ONE_ACCENT_CLASS;
	}
	if (secondPlayer?.id && secondPlayer.id === playerId) {
		return PLAYER_TWO_ACCENT_CLASS;
	}
	return NEUTRAL_ACCENT_CLASS;
}

export {
	NEUTRAL_ACCENT_CLASS,
	PLAYER_ONE_ACCENT_CLASS,
	PLAYER_TWO_ACCENT_CLASS,
	resolvePlayerAccentClass,
};
