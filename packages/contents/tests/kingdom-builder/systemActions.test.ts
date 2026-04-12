import { describe, it, expect } from 'vitest';
import type { Registry } from '@boardsmith/protocol';
import { SystemRole } from '@boardsmith/contents-sdk';
import { findActionByRole, findActionsByRole, extractSystemActionIds } from '../../src/kingdom-builder/systemActions';

// Minimal mock type that matches what systemActions.ts expects
interface MockAction {
	id: string;
	name: string;
	effects: unknown[];
	metaCategory: string;
	system?: boolean;
	systemRole?: string;
}

function createMockAction(id: string, systemRole?: string): MockAction {
	return {
		id,
		name: id,
		effects: [],
		metaCategory: 'commands',
		system: systemRole !== undefined,
		systemRole,
	};
}

function createMockRegistry(actions: MockAction[]): Registry<MockAction> {
	const registry = new Map<string, MockAction>();
	for (const action of actions) {
		registry.set(action.id, action);
	}
	return registry as unknown as Registry<MockAction>;
}

describe('systemActions', () => {
	describe('findActionByRole', () => {
		it('returns the action matching the role', () => {
			const actions = createMockRegistry([createMockAction('action1'), createMockAction('setup', SystemRole.INITIAL_SETUP), createMockAction('action2')]);

			const result = findActionByRole(actions as unknown as Registry<MockAction>, SystemRole.INITIAL_SETUP);

			expect(result).toBeDefined();
			expect(result?.id).toBe('setup');
		});

		it('returns undefined when no action matches', () => {
			const actions = createMockRegistry([createMockAction('action1'), createMockAction('action2')]);

			const result = findActionByRole(actions as unknown as Registry<MockAction>, SystemRole.INITIAL_SETUP);

			expect(result).toBeUndefined();
		});

		it('returns first match when multiple actions have the same role', () => {
			const actions = createMockRegistry([createMockAction('setup1', SystemRole.INITIAL_SETUP), createMockAction('setup2', SystemRole.INITIAL_SETUP)]);

			const result = findActionByRole(actions as unknown as Registry<MockAction>, SystemRole.INITIAL_SETUP);

			expect(result).toBeDefined();
			expect(result?.id).toBe('setup1');
		});
	});

	describe('findActionsByRole', () => {
		it('returns all actions matching the role', () => {
			const actions = createMockRegistry([createMockAction('setup1', SystemRole.INITIAL_SETUP), createMockAction('other'), createMockAction('setup2', SystemRole.INITIAL_SETUP)]);

			const result = findActionsByRole(actions as unknown as Registry<MockAction>, SystemRole.INITIAL_SETUP);

			expect(result).toHaveLength(2);
			expect(result.map((a) => a.id)).toContain('setup1');
			expect(result.map((a) => a.id)).toContain('setup2');
		});

		it('returns empty array when no actions match', () => {
			const actions = createMockRegistry([createMockAction('action1'), createMockAction('action2')]);

			const result = findActionsByRole(actions as unknown as Registry<MockAction>, SystemRole.INITIAL_SETUP);

			expect(result).toEqual([]);
		});
	});

	describe('extractSystemActionIds', () => {
		it('extracts all system action IDs', () => {
			const actions = createMockRegistry([
				createMockAction('initial_setup', SystemRole.INITIAL_SETUP),
				createMockAction('devmode_setup', SystemRole.INITIAL_SETUP_DEVMODE),
				createMockAction('compensation', SystemRole.COMPENSATION),
			]);

			const result = extractSystemActionIds(actions as unknown as Registry<MockAction>);

			expect(result.initialSetup).toBe('initial_setup');
			expect(result.initialSetupDevmode).toBe('devmode_setup');
			expect(result.compensation).toBe('compensation');
		});

		it('falls back to regular setup if no devmode action exists', () => {
			const actions = createMockRegistry([createMockAction('initial_setup', SystemRole.INITIAL_SETUP), createMockAction('compensation', SystemRole.COMPENSATION)]);

			const result = extractSystemActionIds(actions as unknown as Registry<MockAction>);

			expect(result.initialSetup).toBe('initial_setup');
			expect(result.initialSetupDevmode).toBe('initial_setup');
			expect(result.compensation).toBe('compensation');
		});

		it('throws if no initial setup action found', () => {
			const actions = createMockRegistry([createMockAction('compensation', SystemRole.COMPENSATION)]);

			expect(() => extractSystemActionIds(actions as unknown as Registry<MockAction>)).toThrow('No initial setup action found');
		});

		it('throws if no compensation action found', () => {
			const actions = createMockRegistry([createMockAction('initial_setup', SystemRole.INITIAL_SETUP)]);

			expect(() => extractSystemActionIds(actions as unknown as Registry<MockAction>)).toThrow('No compensation action found');
		});
	});
});
