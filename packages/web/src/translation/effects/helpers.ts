import type { TranslationContext } from '../context';
import { selectPopulationDescriptor } from './registrySelectors';

export const signed = (n: number): string => (n >= 0 ? '+' : '');
export const gainOrLose = (n: number): string => (n >= 0 ? 'Gain' : 'Lose');
export const increaseOrDecrease = (n: number): string =>
	n >= 0 ? 'Increase' : 'Decrease';

/**
 * Resolve display metadata (icon and label) for a population role.
 *
 * @param context - Translation context used to produce a localized label
 * @param role - Population role identifier or `undefined` when no role is specified
 * @returns An object with `icon` — the icon identifier for the role, and `label` — the localized label suitable for UI display
 */
export function resolvePopulationDisplay(
	context: TranslationContext,
	role: string | undefined,
): {
	icon: string;
	label: string;
} {
	return selectPopulationDescriptor(context, role);
}