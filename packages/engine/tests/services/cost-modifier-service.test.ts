import { describe, it, expect } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { getActionCosts } from '../../src';
import { createTestEngine } from '../helpers';
import { CostModifierService } from '../../src/services/cost_modifier_service';

describe('CostModifierService', () => {
	it('applies per-resource percent modifiers with object round instructions', () => {
		const content = createContentFactory();
		const resourceKeys = Object.values(CResource);
		const resourceA = resourceKeys[0];
		const resourceB = resourceKeys[1] ?? resourceKeys[0];
		const action = content.action({
			baseCosts: {
				[resourceA]: 7,
				[resourceB]: 9,
			},
		});
		const ctx = createTestEngine({ actions: content.actions });
		const baseCosts = getActionCosts(action.id, ctx);
		const base = {
			[resourceA]: baseCosts[resourceA] ?? 0,
			[resourceB]: baseCosts[resourceB] ?? 0,
		};
		const service = new CostModifierService();
		service.register('flatA', (id) => {
			if (id !== action.id) {
				return;
			}
			return { flat: { [resourceA]: 3 } };
		});
		service.register('flatB', (id) => {
			if (id !== action.id) {
				return;
			}
			return { flat: { [resourceB]: -2 } };
		});
		service.register('percentA', (id) => {
			if (id !== action.id) {
				return;
			}
			return {
				percent: { [resourceA]: 0.2, [resourceB]: 0.15 },
				round: { [resourceA]: 'up' },
			};
		});
		service.register('percentB', (id) => {
			if (id !== action.id) {
				return;
			}
			return {
				percent: { [resourceA]: 0.05, [resourceB]: -0.35 },
				round: { [resourceB]: 'down' },
			};
		});
		const result = service.apply(action.id, base, ctx);
		const baseA = base[resourceA] ?? 0;
		const baseB = base[resourceB] ?? 0;
		const afterFlatA = baseA + 3;
		const afterFlatB = baseB - 2;
		const percentA = afterFlatA * 0.25;
		const percentB = afterFlatB * -0.2;
		expect(result[resourceA]).toBe(afterFlatA + Math.ceil(percentA));
		expect(result[resourceB]).toBe(
			afterFlatB + (percentB >= 0 ? Math.floor(percentB) : Math.ceil(percentB)),
		);
		expect(base[resourceA]).toBe(baseA);
		expect(base[resourceB]).toBe(baseB);
	});

	it('unregisters modifiers and keeps clones independent', () => {
		const content = createContentFactory();
		const resourceKeys = Object.values(CResource);
		const resourceA = resourceKeys[0];
		const resourceB = resourceKeys[1] ?? resourceKeys[0];
		const action = content.action({
			baseCosts: {
				[resourceA]: 6,
				[resourceB]: 4,
			},
		});
		const ctx = createTestEngine({ actions: content.actions });
		const baseCosts = getActionCosts(action.id, ctx);
		const base = {
			[resourceA]: baseCosts[resourceA] ?? 0,
			[resourceB]: baseCosts[resourceB] ?? 0,
		};
		const service = new CostModifierService();
		service.register('flat', (id) => {
			if (id !== action.id) {
				return;
			}
			return { flat: { [resourceA]: 4 } };
		});
		service.register('percent', (id) => {
			if (id !== action.id) {
				return;
			}
			return { percent: { [resourceB]: 0.5 } };
		});
		service.unregister('percent');
		const afterUnregister = service.apply(action.id, base, ctx);
		const baseA = base[resourceA] ?? 0;
		const baseB = base[resourceB] ?? 0;
		expect(afterUnregister[resourceA]).toBe(baseA + 4);
		expect(afterUnregister[resourceB]).toBe(baseB);
		const clone = service.clone();
		clone.unregister('flat');
		clone.register('clonePercent', (id) => {
			if (id !== action.id) {
				return;
			}
			return {
				percent: { [resourceB]: 0.25 },
				round: { [resourceB]: 'up' },
			};
		});
		const cloneResult = clone.apply(action.id, base, ctx);
		const originalResult = service.apply(action.id, base, ctx);
		expect(originalResult[resourceA]).toBe(baseA + 4);
		expect(originalResult[resourceB]).toBe(baseB);
		const clonePercent = baseB * 0.25;
		expect(cloneResult[resourceA]).toBe(baseA);
		expect(cloneResult[resourceB]).toBe(baseB + Math.ceil(clonePercent));
	});
});
