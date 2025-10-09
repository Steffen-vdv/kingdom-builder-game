import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	applyCostsWithPassives,
	getActionCosts,
	getActionRequirements,
} from '../../src/actions/costs.ts';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';

function expectMissingActionError(actionId: string) {
	return `Action ${actionId} is not registered in the engine context`;
}

describe('action costs error handling', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('throws when costs are requested for an unknown action', () => {
		const content = createContentFactory();
		const action = content.action();
		const ctx = createTestEngine({ actions: content.actions });
		const expectedMessage = expectMissingActionError(action.id);
		vi.spyOn(ctx.actions, 'get').mockImplementation(() => {
			return undefined as unknown as typeof action;
		});

		expect(() => getActionCosts(action.id, ctx)).toThrowError(expectedMessage);
	});

	it('throws when passive mods see an unknown action', () => {
		const content = createContentFactory();
		const action = content.action();
		const ctx = createTestEngine({ actions: content.actions });
		const baseCosts = action.baseCosts || {};
		const expectedMessage = expectMissingActionError(action.id);
		vi.spyOn(ctx.actions, 'get').mockImplementation(() => {
			return undefined as unknown as typeof action;
		});

		expect(() => {
			applyCostsWithPassives(action.id, baseCosts, ctx);
		}).toThrowError(expectedMessage);
	});

	it('throws when requirements use an unknown action', () => {
		const content = createContentFactory();
		const action = content.action();
		const ctx = createTestEngine({ actions: content.actions });
		const expectedMessage = expectMissingActionError(action.id);
		vi.spyOn(ctx.actions, 'get').mockImplementation(() => {
			return undefined as unknown as typeof action;
		});

		expect(() => {
			getActionRequirements(action.id, ctx);
		}).toThrowError(expectedMessage);
	});
});
