import { BROOM_ICON, RESOURCE_TRANSFER_ICON } from './infrastructure/defs';

export const UPKEEP_INFO = {
	icon: BROOM_ICON,
	label: 'Upkeep',
} as const;

export const TRANSFER_INFO = {
	icon: RESOURCE_TRANSFER_ICON,
	label: 'Transfer',
} as const;
