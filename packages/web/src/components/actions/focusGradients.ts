import type { ActionFocus } from './types';

type GradientMap = Record<ActionFocus | string, string> & { default: string };

function joinGradient(parts: readonly string[]): string {
	return parts.join(' ');
}

/**
 * Focus gradients for action cards.
 * Presentation-layer styling based on focus type.
 * Semantic focus data (id, label, color) lives in @boardsmith/contents.
 *
 * Mapping from old focus names:
 * - economy → economy (emerald/green)
 * - aggressive → combat (amber/orange)
 * - defense → research (blue/sky)
 */
export const FOCUS_GRADIENTS: GradientMap = {
	economy: joinGradient([
		'from-emerald-200/70 to-emerald-100/40',
		'dark:from-emerald-900/40 dark:to-emerald-800/20',
	]),
	combat: joinGradient([
		'from-amber-200/70 to-orange-100/40',
		'dark:from-amber-900/40 dark:to-orange-900/20',
	]),
	research: joinGradient([
		'from-blue-200/70 to-sky-100/40',
		'dark:from-blue-900/40 dark:to-sky-900/20',
	]),
	default: joinGradient([
		'from-emerald-200/70 to-emerald-100/40',
		'dark:from-emerald-900/40 dark:to-emerald-800/20',
	]),
};

/**
 * Gets the gradient class for a focus value.
 * Returns the default (economy) gradient as fallback.
 */
export function getFocusGradient(focus: ActionFocus | undefined): string {
	if (focus && focus in FOCUS_GRADIENTS) {
		return FOCUS_GRADIENTS[focus] as string;
	}
	return FOCUS_GRADIENTS.default;
}
