/**
 * Kingdom Builder - Dev Mode Content Package
 *
 * Extends the base game with a modified initial_setup action
 * that provides abundant starting resources for testing.
 */

import type { ContentPackage } from '@kingdom-builder/contents-sdk';
import { createBasePackage } from '../base';

/**
 * Creates the dev-mode content package.
 * This imports base game content and overrides the initial_setup action.
 */
export function createDevModePackage(): ContentPackage {
	const base = createBasePackage();

	// TODO: Override the initial_setup action with dev-mode version
	// that provides abundant starting resources

	return {
		...base,
		id: 'kingdom-builder:dev-mode',
		name: 'Kingdom Builder (Dev Mode)',
		description: 'Development mode with abundant starting resources',
	};
}
