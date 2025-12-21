import type { ActionFocus } from './types';

type GradientMap = Record<ActionFocus | string, string>;

/**
 * Focus gradients for action cards.
 * Presentation-layer styling based on focus type.
 * Semantic focus data (id, label, color) lives in @kingdom-builder/contents.
 */
const FOCUS_GRADIENT_DEFINITIONS = {
	economy: {
		light: 'from-emerald-200',
		dark: 'to-emerald-900',
	},
	combat: {
		light: 'from-amber-200',
		dark: 'to-amber-900',
	},
	research: {
		light: 'from-blue-200',
		dark: 'to-blue-900',
	},
} as const;

function buildFocusGradients(): GradientMap {
	const gradients: GradientMap = {};
	for (const [id, gradient] of Object.entries(FOCUS_GRADIENT_DEFINITIONS)) {
		gradients[id] = `${gradient.light} ${gradient.dark}`;
	}
	return gradients;
}

export const FOCUS_GRADIENTS = buildFocusGradients();

/**
 * Gets the gradient class for a focus value.
 * Returns the Economy focus gradient as default fallback.
 */
export function getFocusGradient(focus: ActionFocus | undefined): string {
	if (focus && focus in FOCUS_GRADIENTS) {
		return FOCUS_GRADIENTS[focus] as string;
	}
	// Fallback to Economy focus
	return FOCUS_GRADIENTS['economy'] as string;
}
