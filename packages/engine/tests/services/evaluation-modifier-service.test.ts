import { describe, expect, it } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents/resourceKeys';
import type { EngineContext } from '../../src/context';
import { EvaluationModifierService } from '../../src/services/evaluation_modifier_service';

describe('EvaluationModifierService', () => {
	it('applies object percent and round modifiers per target and cleans up maps', () => {
		const resourceKeys = Array.from(new Set(Object.values(CResource)));
		const [resourceA, resourceB] = resourceKeys;
		if (!resourceA || !resourceB) {
			throw new Error('expected at least two distinct resource keys');
		}
		const service = new EvaluationModifierService();
		const primaryTarget = 'test:target';
		const secondaryTarget = 'other:target';
		service.register('primary', primaryTarget, () => ({
			percent: {
				[resourceA]: 0.25,
				[resourceB]: 0.6,
			},
			round: {
				[resourceA]: 'up',
				[resourceB]: 'down',
			},
		}));
		service.register('secondary', primaryTarget, () => ({
			percent: {
				[resourceB]: -0.1,
			},
		}));
		service.register('tertiary', secondaryTarget, () => ({
			percent: 0.1,
		}));
		const gains = [
			{ key: resourceA, amount: 10 },
			{ key: resourceB, amount: 5 },
		];
		service.run(primaryTarget, {} as EngineContext, gains);
		expect(gains[0]!.amount).toBe(13);
		expect(gains[1]!.amount).toBe(7);
		const targetMap = service.getMap().get(primaryTarget);
		expect(targetMap?.has('primary')).toBe(true);
		expect(targetMap?.has('secondary')).toBe(true);
		service.unregister('primary');
		const afterPrimaryRemoval = service.getMap().get(primaryTarget);
		expect(afterPrimaryRemoval?.has('primary')).toBe(false);
		expect(afterPrimaryRemoval?.has('secondary')).toBe(true);
		service.unregister('secondary');
		expect(service.getMap().has(primaryTarget)).toBe(false);
		expect(service.getMap().has(secondaryTarget)).toBe(true);
		service.unregister('tertiary');
		expect(service.getMap().has(secondaryTarget)).toBe(false);
	});

	it('clones into an independent service instance', () => {
		const resourceKeys = Array.from(new Set(Object.values(CResource)));
		const [resourceA, resourceB] = resourceKeys;
		if (!resourceA || !resourceB) {
			throw new Error('expected at least two distinct resource keys');
		}
		const service = new EvaluationModifierService();
		const target = 'clone:target';
		service.register('original', target, () => ({ percent: 0.5 }));
		const clone = service.clone();
		clone.register('cloneOnly', target, () => ({
			percent: {
				[resourceB]: -0.25,
			},
		}));
		const cloneGains = [
			{ key: resourceA, amount: 4 },
			{ key: resourceB, amount: 8 },
		];
		clone.run(target, {} as EngineContext, cloneGains);
		expect(cloneGains[0]!.amount).toBe(6);
		expect(cloneGains[1]!.amount).toBe(10);
		clone.unregister('original');
		const originalMap = service.getMap().get(target);
		expect(originalMap?.has('original')).toBe(true);
		expect(originalMap?.has('cloneOnly')).toBe(false);
		const originalGains = [
			{ key: resourceA, amount: 4 },
			{ key: resourceB, amount: 8 },
		];
		service.run(target, {} as EngineContext, originalGains);
		expect(originalGains[0]!.amount).toBe(6);
		expect(originalGains[1]!.amount).toBe(12);
		expect(clone.getMap().get(target)?.has('original')).toBe(false);
		expect(clone.getMap().get(target)?.has('cloneOnly')).toBe(true);
	});
});
