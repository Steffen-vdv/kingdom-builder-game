import { BROOM_ICON, GENERAL_RESOURCE_ICON, RESOURCE_TRANSFER_ICON } from './defs';

export const UPKEEP_INFO = {
	icon: BROOM_ICON,
	label: 'Upkeep',
} as const;

export const TRANSFER_INFO = {
	icon: `${GENERAL_RESOURCE_ICON}${RESOURCE_TRANSFER_ICON}`,
	label: 'Resource Transfer',
} as const;

/**
 * Keyword labels used in modifier translations.
 * These are text-only keywords without icons.
 */
export const KEYWORD_LABELS = {
	resourceGain: 'Resource Gain',
	cost: 'Cost',
} as const;
