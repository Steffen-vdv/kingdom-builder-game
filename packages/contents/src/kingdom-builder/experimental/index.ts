/**
 * Kingdom Builder - Experimental Content Package
 *
 * Preview content package for upcoming balance changes and new
 * features. Initially identical to the base game — diverges as
 * the design team's v2 changes are applied.
 *
 * Imports and extends the base package. The original base content
 * is never modified. Rollback: change DEFAULT_CONTENT_ID back to
 * 'kingdom-builder:base' in loader.ts.
 */

import type { ContentPackage } from '@kingdom-builder/contents-sdk';
import { createBasePackage } from '../base';

/**
 * Creates the experimental content package.
 *
 * Currently a 1:1 clone of base. As v2 content lands, this
 * factory will apply modifications on top of the base package.
 */
export function createExperimentalPackage(): ContentPackage {
	const base = createBasePackage();

	return {
		...base,
		id: 'kingdom-builder:experimental',
		name: 'Kingdom Builder (Experimental)',
		description: 'Preview upcoming balance changes and new features.',
	};
}
