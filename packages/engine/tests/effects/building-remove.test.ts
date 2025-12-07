import { describe, expect, it, vi } from 'vitest';
import { buildingRemove } from '../../src/effects/building_remove.ts';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import type { EffectDef } from '@kingdom-builder/protocol';

describe('building:remove effect', () => {
	it('requires an id parameter', () => {
		const context = createTestEngine();
		const effect = { type: 'building', method: 'remove' } as EffectDef;
		expect(() => buildingRemove(effect, context, 1)).toThrow(
			'building:remove requires id',
		);
	});

	it('removes existing buildings and stops when none remain', () => {
		const content = createContentFactory();
		const building = content.building();
		const context = createTestEngine({
			buildings: content.buildings,
			developments: content.developments,
			actions: content.actions,
		});
		context.activePlayer.buildings.add(building.id);
		const removePassive = vi.spyOn(context.passives, 'removePassive');
		const effect: EffectDef = {
			type: 'building',
			method: 'remove',
			params: { id: building.id },
		};
		buildingRemove(effect, context, 3);
		expect(context.activePlayer.buildings.has(building.id)).toBe(false);
		expect(removePassive).toHaveBeenCalledTimes(1);
		buildingRemove(effect, context, 1);
		expect(removePassive).toHaveBeenCalledTimes(1);
	});
});
