import {
	POPULATION_INFO,
	POPULATION_ROLES,
	type PopulationRoleId,
} from '@kingdom-builder/contents';

export const signed = (n: number): string => (n >= 0 ? '+' : '');
export const gainOrLose = (n: number): string => (n >= 0 ? 'Gain' : 'Lose');
export const increaseOrDecrease = (n: number): string =>
	n >= 0 ? 'Increase' : 'Decrease';

export function resolvePopulationDisplay(role: PopulationRoleId | undefined): {
	icon: string;
	label: string;
} {
	const info = role ? POPULATION_ROLES[role] : undefined;
	const icon = info?.icon || POPULATION_INFO.icon;
	const label = info?.label || role || POPULATION_INFO.label;
	return { icon, label };
}
