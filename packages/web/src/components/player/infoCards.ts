import {
	GENERAL_RESOURCE_ICON,
	GENERAL_RESOURCE_LABEL,
	GENERAL_STAT_ICON,
} from '../../icons';

export const PLAYER_INFO_CARD_BG =
	'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60';

export const GENERAL_RESOURCE_INFO = {
	icon: GENERAL_RESOURCE_ICON,
	label: GENERAL_RESOURCE_LABEL,
	description:
		'Resources represent the various currencies your kingdom manages. They are gained, spent, and modified by actions, passives, and triggered effects throughout the game.',
};

export const GENERAL_STAT_INFO = {
	icon: GENERAL_STAT_ICON,
	label: 'Stats',
	description:
		'Stats capture enduring strengths and capacities for your kingdom. They shift when effects adjust long-term capabilities, and their history tracks notable peaks even after values return to zero.',
};
