/**
 * System action roles.
 *
 * These constants define the roles that system actions can fulfill.
 * Actions declare their role via .system(SystemRole.XXX), and the
 * engine finds actions by their role.
 */
export const SystemRole = {
	/** Action run at game start to set up initial player state */
	INITIAL_SETUP: 'initial-setup',

	/** Action run at game start in dev mode (more resources, etc.) */
	INITIAL_SETUP_DEVMODE: 'initial-setup-devmode',

	/** Action run for player 2 to compensate for going second */
	COMPENSATION: 'compensation',
} as const;

export type SystemRoleValue = (typeof SystemRole)[keyof typeof SystemRole];
