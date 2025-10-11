import type { FocusId } from './types';

type GradientMap = Record<string, string> & { default: string };

function joinGradient(parts: readonly string[]): string {
	return parts.join(' ');
}

export const FOCUS_GRADIENTS: GradientMap = {
	economy: joinGradient([
		'from-emerald-200/70 to-emerald-100/40',
		'dark:from-emerald-900/40 dark:to-emerald-800/20',
	]),
	aggressive: joinGradient([
		'from-amber-200/70 to-orange-100/40',
		'dark:from-amber-900/40 dark:to-orange-900/20',
	]),
	defense: joinGradient([
		'from-blue-200/70 to-sky-100/40',
		'dark:from-blue-900/40 dark:to-sky-900/20',
	]),
	other: joinGradient([
		'from-rose-200/70 to-rose-100/40',
		'dark:from-rose-900/40 dark:to-rose-800/20',
	]),
	default: joinGradient([
		'from-rose-200/70 to-rose-100/40',
		'dark:from-rose-900/40 dark:to-rose-800/20',
	]),
};

export function resolveFocusGradient(focus: FocusId | undefined): string {
	if (focus) {
		const gradient = FOCUS_GRADIENTS[focus];
		if (typeof gradient === 'string') {
			return gradient;
		}
	}
	return FOCUS_GRADIENTS.default;
}
