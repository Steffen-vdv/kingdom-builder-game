/**
 * Kingdom Builder - Dev Mode Content Package
 *
 * Extends the base game with a modified initial_setup action
 * that provides abundant starting resources for testing.
 */

import type { ContentPackage } from '@kingdom-builder/contents-sdk';
import { SystemRole } from '@kingdom-builder/contents-sdk';
import { createBasePackage } from '../base';
import { ActionId, type ActionDef } from '../../actions';

/**
 * Creates the dev-mode content package.
 * This imports base game content and overrides the initial_setup action
 * with the dev-mode version that provides abundant starting resources.
 */
export function createDevModePackage(): ContentPackage {
	const base = createBasePackage();

	// Get the devmode initial setup action from the base registry
	const devmodeSetupAction = base.actions.get(ActionId.initial_setup_devmode);
	if (!devmodeSetupAction) {
		throw new Error('Dev mode initial setup action not found in base registry');
	}

	// Clone the devmode action with the standard initial_setup id and role
	const overrideSetupAction: ActionDef = {
		...devmodeSetupAction,
		id: ActionId.initial_setup,
		systemRole: SystemRole.INITIAL_SETUP,
	};

	// Replace the initial_setup action in the registry
	base.actions.remove(ActionId.initial_setup);
	base.actions.add(ActionId.initial_setup, overrideSetupAction);

	return {
		...base,
		id: 'kingdom-builder:dev-mode',
		name: 'Kingdom Builder (Dev Mode)',
		description: 'Development mode with abundant starting resources',
	};
}
