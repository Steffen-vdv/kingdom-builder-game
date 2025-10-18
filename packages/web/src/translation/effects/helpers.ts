import type { TranslationContext } from '../context';
import { selectPopulationDescriptor } from './registrySelectors';

export const signed = (n: number): string => (n >= 0 ? '+' : '');
export const gainOrLose = (n: number): string => (n >= 0 ? 'Gain' : 'Lose');
export const increaseOrDecrease = (n: number): string =>
	n >= 0 ? 'Increase' : 'Decrease';

export function formatStatIconLabel(
	icon: string | undefined,
	label: string,
	fallbackKey?: string,
): string {
	if (typeof icon !== 'string') {
		return label;
	}
	const trimmed = icon.trim();
	if (trimmed.length === 0 || (fallbackKey && trimmed === fallbackKey)) {
		return label;
	}
	return `${trimmed} ${label}`;
}

export function resolvePopulationDisplay(
	context: TranslationContext,
	role: string | undefined,
): {
	icon: string;
	label: string;
} {
	return selectPopulationDescriptor(context, role);
}
