/**
 * System Action Utilities
 *
 * Helpers for finding system actions by their role.
 */

import type { Registry } from '@boardsmith/protocol';
import type { ActionDef } from './content/actions';
import { SystemRole, type SystemRoleValue } from './content/constants';

/**
 * System action IDs interface - used by the engine.
 */
export interface SystemActionIds {
	initialSetup: string;
	initialSetupDevmode: string;
	compensation: string;
}

/**
 * Finds the first action with a given system role.
 */
export function findActionByRole(actions: Registry<ActionDef>, role: SystemRoleValue): ActionDef | undefined {
	for (const [, action] of actions.entries()) {
		if (action.systemRole === role) {
			return action;
		}
	}
	return undefined;
}

/**
 * Finds all actions with a given system role.
 */
export function findActionsByRole(actions: Registry<ActionDef>, role: SystemRoleValue): ActionDef[] {
	const result: ActionDef[] = [];
	for (const [, action] of actions.entries()) {
		if (action.systemRole === role) {
			result.push(action);
		}
	}
	return result;
}

/**
 * Extracts system action IDs from an actions registry.
 * This is used to provide systemActionIds to the engine.
 */
export function extractSystemActionIds(actions: Registry<ActionDef>): SystemActionIds {
	const initialSetupAction = findActionByRole(actions, SystemRole.INITIAL_SETUP);
	const devmodeSetupAction = findActionByRole(actions, SystemRole.INITIAL_SETUP_DEVMODE);
	const compensationAction = findActionByRole(actions, SystemRole.COMPENSATION);

	if (!initialSetupAction) {
		throw new Error('No initial setup action found with systemRole "initial-setup"');
	}
	if (!compensationAction) {
		throw new Error('No compensation action found with systemRole "compensation"');
	}

	// Fall back to regular setup if no devmode-specific action exists
	const initialSetup = initialSetupAction.id;
	const initialSetupDevmode = devmodeSetupAction?.id ?? initialSetup;

	return {
		initialSetup,
		initialSetupDevmode,
		compensation: compensationAction.id,
	};
}
