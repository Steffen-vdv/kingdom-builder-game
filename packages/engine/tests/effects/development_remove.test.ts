import { describe, expect, it, vi } from 'vitest';
import { developmentRemove } from '../../src/effects';
import type { EffectDef } from '@kingdom-builder/protocol';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';

function createRemovalEffect(params: Record<string, unknown>): EffectDef {
	return {
		type: 'development',
		method: 'remove',
		params,
	} as EffectDef;
}

describe('development:remove effect', () => {
	it('removes matching developments and passives for each iteration', () => {
		const content = createContentFactory();
		const development = content.development();
		const engineContext = createTestEngine(content);
		const land = engineContext.activePlayer.lands[0];
		land.developments = [development.id, development.id];
		land.slotsUsed = land.developments.length;
		const removePassive = vi.spyOn(engineContext.passives, 'removePassive');

		developmentRemove(
			createRemovalEffect({
				id: development.id,
				landId: land.id,
			}),
			engineContext,
			2,
		);

		expect(land.developments).toEqual([]);
		expect(land.slotsUsed).toBe(0);
		expect(removePassive).toHaveBeenCalledTimes(2);
		expect(removePassive).toHaveBeenCalledWith(
			`${development.id}_${land.id}`,
			engineContext,
		);
	});

	it('stops removing when no copies remain even if multiplier is higher', () => {
		const content = createContentFactory();
		const development = content.development();
		const engineContext = createTestEngine(content);
		const land = engineContext.activePlayer.lands[0];
		land.developments = [development.id];
		land.slotsUsed = land.developments.length;
		const removePassive = vi.spyOn(engineContext.passives, 'removePassive');

		developmentRemove(
			createRemovalEffect({
				id: development.id,
				landId: land.id,
			}),
			engineContext,
			3,
		);

		expect(land.developments).toEqual([]);
		expect(land.slotsUsed).toBe(0);
		expect(removePassive).toHaveBeenCalledTimes(1);
	});

	it('throws when id or landId are missing', () => {
		const content = createContentFactory();
		const engineContext = createTestEngine(content);
		expect(() =>
			developmentRemove(createRemovalEffect({}), engineContext, 1),
		).toThrow(/requires id and landId/);
	});

	it('throws when the land cannot be found', () => {
		const content = createContentFactory();
		const development = content.development();
		const engineContext = createTestEngine(content);

		expect(() =>
			developmentRemove(
				createRemovalEffect({
					id: development.id,
					landId: 'missing-land',
				}),
				engineContext,
				1,
			),
		).toThrow(/Land missing-land not found/);
	});
});
