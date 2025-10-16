import type { SessionPopulationRoleId } from '@kingdom-builder/protocol/session';
import type { TranslationContext } from '../context';
import { selectPopulationDescriptor } from './registrySelectors';

export const signed = (n: number): string => (n >= 0 ? '+' : '');
export const gainOrLose = (n: number): string => (n >= 0 ? 'Gain' : 'Lose');
export const increaseOrDecrease = (n: number): string =>
	n >= 0 ? 'Increase' : 'Decrease';

export function resolvePopulationDisplay(
	context: TranslationContext,
	role: SessionPopulationRoleId | undefined,
): {
	icon: string;
	label: string;
} {
	return selectPopulationDescriptor(context, role);
}
