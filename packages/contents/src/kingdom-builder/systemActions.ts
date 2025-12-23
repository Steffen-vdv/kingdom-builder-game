/**
 * System Action Utilities
 *
 * Helpers for finding system actions by their role.
 */

import type { Registry } from '@kingdom-builder/protocol';
import type { ActionDef } from '../actions';
import { SystemRole, type SystemRoleValue } from '../internal';

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
export function extractSystemActionIds(actions: Registry<ActionDef>, _devMode = false): SystemActionIds {
	const initialSetupActions = findActionsByRole(actions, SystemRole.INITIAL_SETUP);
	const compensationAction = findActionByRole(actions, SystemRole.COMPENSATION);

	if (initialSetupActions.length === 0) {
		throw new Error('No initial setup action found with systemRole "initial-setup"');
	}
	if (!compensationAction) {
		throw new Error('No compensation action found with systemRole "compensation"');
	}

	// Find the regular and devmode setup actions
	let initialSetup: string | undefined;
	let initialSetupDevmode: string | undefined;

	for (const action of initialSetupActions) {
		if (!action.id) {
			continue;
		}
		// If the action ID contains 'devmode', it's the devmode setup
		if (action.id.includes('devmode')) {
			initialSetupDevmode = action.id;
		} else {
			initialSetup = action.id;
		}
	}

	// If no devmode action found, use the regular one for both
	if (!initialSetup && initialSetupDevmode) {
		initialSetup = initialSetupDevmode;
	}
	if (!initialSetupDevmode && initialSetup) {
		initialSetupDevmode = initialSetup;
	}

	if (!initialSetup || !initialSetupDevmode) {
		throw new Error('Could not determine initial setup action IDs');
	}

	return {
		initialSetup,
		initialSetupDevmode,
		compensation: compensationAction.id,
	};
}
