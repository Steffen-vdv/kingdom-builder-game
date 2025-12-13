import type { ColorVariant } from './ResourceButton';

/**
 * Determine color variant for combat stats based on resource ID patterns.
 * Army/military get red tint, attack gets purple, defense/fort get blue tint.
 */
export function getColorVariant(resourceId: string): ColorVariant {
	const lower = resourceId.toLowerCase();
	// Attack/damage = purple
	if (lower.includes('attack') || lower.includes('damage')) {
		return 'attack';
	}
	// Army/military/HP = red
	if (
		lower.includes('army') ||
		lower.includes('military') ||
		lower.includes('hp') ||
		lower.includes('health')
	) {
		return 'army';
	}
	// Defense/fort/shield = blue
	if (
		lower.includes('defense') ||
		lower.includes('fort') ||
		lower.includes('shield')
	) {
		return 'fort';
	}
	return 'default';
}
