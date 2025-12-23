/**
 * Focus types for categorizing actions and buildings.
 *
 * Focus represents the strategic domain an action or building belongs to.
 * Games can extend or replace these with their own focus types.
 */

export const Focus = {
	Economy: 'economy',
	Combat: 'combat',
	Research: 'research',
} as const;

export type FocusValue = (typeof Focus)[keyof typeof Focus];

/**
 * Focus definition with content-driven metadata.
 * Presentation styling (gradients) is handled by the web layer.
 */
export interface FocusDefinition {
	readonly id: FocusValue;
	readonly label: string;
	readonly color: string;
}

/**
 * Content-driven focus definitions.
 * Semantic data only - presentation styling is in the web layer.
 */
export const FocusDefinitions: Record<FocusValue, FocusDefinition> = {
	[Focus.Economy]: {
		id: Focus.Economy,
		label: 'Economy',
		color: '#10b981',
	},
	[Focus.Combat]: {
		id: Focus.Combat,
		label: 'Combat',
		color: '#f59e0b',
	},
	[Focus.Research]: {
		id: Focus.Research,
		label: 'Research',
		color: '#3b82f6',
	},
};
