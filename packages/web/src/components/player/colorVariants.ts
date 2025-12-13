import type { ColorVariant } from './ResourceButton';

/**
 * Determine color variant for combat stats based on resource ID patterns.
 * Army/military get red tint, defense/fort get blue tint.
 */
export function getColorVariant(resourceId: string): ColorVariant {
	const lower = resourceId.toLowerCase();
	if (
		lower.includes('army') ||
		lower.includes('attack') ||
		lower.includes('military')
	) {
		return 'army';
	}
	if (
		lower.includes('defense') ||
		lower.includes('fort') ||
		lower.includes('shield')
	) {
		return 'fort';
	}
	return 'default';
}
