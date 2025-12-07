import { describe, it, beforeEach, expect } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../../src/context.ts';
import { PlayerState } from '../../src/state/index.ts';
import {
	createRuntimeResourceCatalog,
	initialisePlayerResourceState,
	setResourceValue,
	getResourceValue,
} from '../../src/resource-v2/index.ts';
import {
	resourceAddV2,
	resourceRemoveV2,
} from '../../src/resource-v2/effects/addRemove.ts';
import {
	reconcileResourceChange,
	ResourceBoundExceededError,
} from '../../src/resource-v2/reconciliation.ts';
import {
	resourceV2Definition,
	resourceV2GroupDefinition,
	createResourceV2Registries,
} from '@kingdom-builder/testing';

interface TestContext {
	context: EngineContext;
	active: PlayerState;
	opponent: PlayerState;
	goldId: string;
	catalog: ReturnType<typeof createRuntimeResourceCatalog>;
}

function createTestContext(): TestContext {
	const group = resourceV2GroupDefinition({
		id: 'group-currency',
	});

	const gold = resourceV2Definition({
		id: 'resource-gold',
		metadata: { group: { id: group.id } },
		bounds: { lowerBound: 0, upperBound: 100 },
	});

	const registries = createResourceV2Registries({
		resources: [gold],
		groups: [group],
	});

	const catalog = createRuntimeResourceCatalog(registries);

	const active = new PlayerState('A', 'Active Player');
	const opponent = new PlayerState('B', 'Opponent Player');
	initialisePlayerResourceState(active, catalog);
	initialisePlayerResourceState(opponent, catalog);

	const baseContext = {
		game: { resourceCatalogV2: catalog },
		resourceCatalogV2: catalog,
		recentResourceGains: [] as { key: string; amount: number }[],
		activePlayer: active,
		opponent,
	} as unknown as EngineContext;

	return {
		context: baseContext,
		active,
		opponent,
		goldId: gold.id,
		catalog,
	};
}

describe('Reconciliation strategies', () => {
	describe('clamp mode (default)', () => {
		let ctx: TestContext;

		beforeEach(() => {
			ctx = createTestContext();
		});

		it('clamps values that would exceed upper bound', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 90);

			const effect: EffectDef = {
				params: {
					resourceId: ctx.goldId,
					change: { type: 'amount', amount: 20 },
					// reconciliation defaults to 'clamp'
				},
			};

			resourceAddV2(effect, ctx.context);

			expect(getResourceValue(ctx.active, ctx.goldId)).toBe(100);
			expect(ctx.active.resourceBoundTouched[ctx.goldId]).toEqual({
				lower: false,
				upper: true,
			});
		});

		it('clamps values that would go below lower bound', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 5);

			const effect: EffectDef = {
				params: {
					resourceId: ctx.goldId,
					change: { type: 'amount', amount: 10 },
					reconciliation: 'clamp',
				},
			};

			resourceRemoveV2(effect, ctx.context);

			expect(getResourceValue(ctx.active, ctx.goldId)).toBe(0);
			expect(ctx.active.resourceBoundTouched[ctx.goldId]).toEqual({
				lower: true,
				upper: false,
			});
		});
	});

	describe('pass mode', () => {
		let ctx: TestContext;

		beforeEach(() => {
			ctx = createTestContext();
		});

		it('allows values to exceed upper bound', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 90);

			const effect: EffectDef = {
				params: {
					resourceId: ctx.goldId,
					change: { type: 'amount', amount: 20 },
					reconciliation: 'pass',
				},
			};

			resourceAddV2(effect, ctx.context);

			// Value exceeds upper bound of 100
			expect(getResourceValue(ctx.active, ctx.goldId)).toBe(110);
			// Bound touched flags are not set since we bypassed bounds
			expect(ctx.active.resourceBoundTouched[ctx.goldId]).toEqual({
				lower: false,
				upper: false,
			});
		});

		it('allows values to go below lower bound (negative values)', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 5);

			const effect: EffectDef = {
				params: {
					resourceId: ctx.goldId,
					change: { type: 'amount', amount: 15 },
					reconciliation: 'pass',
				},
			};

			resourceRemoveV2(effect, ctx.context);

			// Value goes below lower bound of 0
			expect(getResourceValue(ctx.active, ctx.goldId)).toBe(-10);
			expect(ctx.active.resourceBoundTouched[ctx.goldId]).toEqual({
				lower: false,
				upper: false,
			});
		});

		it('applies percent changes without clamping', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 80);

			const effect: EffectDef = {
				params: {
					resourceId: ctx.goldId,
					change: { type: 'percent', modifiers: [0.5] },
					reconciliation: 'pass',
				},
			};

			resourceAddV2(effect, ctx.context);

			// 80 + 50% of 80 = 80 + 40 = 120 (exceeds upper bound of 100)
			expect(getResourceValue(ctx.active, ctx.goldId)).toBe(120);
		});
	});

	describe('reject mode', () => {
		let ctx: TestContext;

		beforeEach(() => {
			ctx = createTestContext();
		});

		it('throws ResourceBoundExceededError when upper bound would be exceeded', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 90);

			const effect: EffectDef = {
				params: {
					resourceId: ctx.goldId,
					change: { type: 'amount', amount: 20 },
					reconciliation: 'reject',
				},
			};

			expect(() => resourceAddV2(effect, ctx.context)).toThrow(
				ResourceBoundExceededError,
			);

			// Value should remain unchanged
			expect(getResourceValue(ctx.active, ctx.goldId)).toBe(90);
		});

		it('throws ResourceBoundExceededError when lower bound would be exceeded', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 5);

			const effect: EffectDef = {
				params: {
					resourceId: ctx.goldId,
					change: { type: 'amount', amount: 10 },
					reconciliation: 'reject',
				},
			};

			expect(() => resourceRemoveV2(effect, ctx.context)).toThrow(
				ResourceBoundExceededError,
			);

			// Value should remain unchanged
			expect(getResourceValue(ctx.active, ctx.goldId)).toBe(5);
		});

		it('provides meaningful error details for upper bound violation', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 90);

			const effect: EffectDef = {
				params: {
					resourceId: ctx.goldId,
					change: { type: 'amount', amount: 20 },
					reconciliation: 'reject',
				},
			};

			try {
				resourceAddV2(effect, ctx.context);
				expect.fail('Should have thrown ResourceBoundExceededError');
			} catch (error) {
				expect(error).toBeInstanceOf(ResourceBoundExceededError);
				const boundError = error as ResourceBoundExceededError;
				expect(boundError.boundType).toBe('upper');
				expect(boundError.targetValue).toBe(110);
				expect(boundError.boundValue).toBe(100);
				expect(boundError.requestedDelta).toBe(20);
			}
		});

		it('provides meaningful error details for lower bound violation', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 5);

			const effect: EffectDef = {
				params: {
					resourceId: ctx.goldId,
					change: { type: 'amount', amount: 10 },
					reconciliation: 'reject',
				},
			};

			try {
				resourceRemoveV2(effect, ctx.context);
				expect.fail('Should have thrown ResourceBoundExceededError');
			} catch (error) {
				expect(error).toBeInstanceOf(ResourceBoundExceededError);
				const boundError = error as ResourceBoundExceededError;
				expect(boundError.boundType).toBe('lower');
				expect(boundError.targetValue).toBe(-5);
				expect(boundError.boundValue).toBe(0);
				expect(boundError.requestedDelta).toBe(-10);
			}
		});

		it('allows changes that stay within bounds', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 50);

			const effect: EffectDef = {
				params: {
					resourceId: ctx.goldId,
					change: { type: 'amount', amount: 30 },
					reconciliation: 'reject',
				},
			};

			// Should not throw
			resourceAddV2(effect, ctx.context);

			expect(getResourceValue(ctx.active, ctx.goldId)).toBe(80);
		});
	});

	describe('reconcileResourceChange direct function', () => {
		it('pass mode bypasses bounds completely', () => {
			const result = reconcileResourceChange({
				currentValue: 50,
				change: { type: 'amount', amount: 100 },
				bounds: { lowerBound: 0, upperBound: 80 },
				reconciliationMode: 'pass',
			});

			expect(result.requestedDelta).toBe(100);
			expect(result.appliedDelta).toBe(100);
			expect(result.finalValue).toBe(150);
			expect(result.clampedToLowerBound).toBe(false);
			expect(result.clampedToUpperBound).toBe(false);
		});

		it('reject mode throws on bound violation', () => {
			expect(() =>
				reconcileResourceChange({
					currentValue: 50,
					change: { type: 'amount', amount: 100 },
					bounds: { lowerBound: 0, upperBound: 80 },
					reconciliationMode: 'reject',
				}),
			).toThrow(ResourceBoundExceededError);
		});

		it('reject mode succeeds when bounds are not exceeded', () => {
			const result = reconcileResourceChange({
				currentValue: 50,
				change: { type: 'amount', amount: 20 },
				bounds: { lowerBound: 0, upperBound: 80 },
				reconciliationMode: 'reject',
			});

			expect(result.requestedDelta).toBe(20);
			expect(result.appliedDelta).toBe(20);
			expect(result.finalValue).toBe(70);
			expect(result.clampedToLowerBound).toBe(false);
			expect(result.clampedToUpperBound).toBe(false);
		});

		it('clamp mode constrains to bounds', () => {
			const result = reconcileResourceChange({
				currentValue: 50,
				change: { type: 'amount', amount: 100 },
				bounds: { lowerBound: 0, upperBound: 80 },
				reconciliationMode: 'clamp',
			});

			expect(result.requestedDelta).toBe(100);
			expect(result.appliedDelta).toBe(30);
			expect(result.finalValue).toBe(80);
			expect(result.clampedToLowerBound).toBe(false);
			expect(result.clampedToUpperBound).toBe(true);
		});
	});

	describe('edge cases and boundary conditions', () => {
		let ctx: TestContext;

		beforeEach(() => {
			ctx = createTestContext();
		});

		describe('exact boundary values', () => {
			it('clamp: change that lands exactly on upper bound is applied fully', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 80);

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'amount', amount: 20 },
						reconciliation: 'clamp',
					},
				};

				resourceAddV2(effect, ctx.context);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(100);
				// Lands exactly on bound - not clamped, just reached it
				expect(ctx.active.resourceBoundTouched[ctx.goldId].upper).toBe(false);
			});

			it('clamp: change that lands exactly on lower bound is applied fully', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 30);

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'amount', amount: 30 },
						reconciliation: 'clamp',
					},
				};

				resourceRemoveV2(effect, ctx.context);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(0);
				expect(ctx.active.resourceBoundTouched[ctx.goldId].lower).toBe(false);
			});

			it('reject: change that lands exactly on upper bound succeeds', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 80);

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'amount', amount: 20 },
						reconciliation: 'reject',
					},
				};

				// Should not throw - exactly on bound is allowed
				resourceAddV2(effect, ctx.context);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(100);
			});

			it('reject: change that lands exactly on lower bound succeeds', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 30);

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'amount', amount: 30 },
						reconciliation: 'reject',
					},
				};

				// Should not throw - exactly on bound is allowed
				resourceRemoveV2(effect, ctx.context);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(0);
			});
		});

		describe('null/undefined bounds', () => {
			it('pass: works with null bounds (no bounds defined)', () => {
				const result = reconcileResourceChange({
					currentValue: 50,
					change: { type: 'amount', amount: 1000 },
					bounds: null,
					reconciliationMode: 'pass',
				});

				expect(result.finalValue).toBe(1050);
				expect(result.appliedDelta).toBe(1000);
			});

			it('reject: succeeds when no bounds defined', () => {
				const result = reconcileResourceChange({
					currentValue: 50,
					change: { type: 'amount', amount: 1000 },
					bounds: null,
					reconciliationMode: 'reject',
				});

				expect(result.finalValue).toBe(1050);
				expect(result.appliedDelta).toBe(1000);
			});

			it('clamp: no clamping when bounds are null', () => {
				const result = reconcileResourceChange({
					currentValue: 50,
					change: { type: 'amount', amount: 1000 },
					bounds: null,
					reconciliationMode: 'clamp',
				});

				expect(result.finalValue).toBe(1050);
				expect(result.appliedDelta).toBe(1000);
				expect(result.clampedToUpperBound).toBe(false);
			});

			it('reject: only checks upper bound when lower is null', () => {
				const result = reconcileResourceChange({
					currentValue: 50,
					change: { type: 'amount', amount: -100 },
					bounds: { lowerBound: null, upperBound: 80 },
					reconciliationMode: 'reject',
				});

				// Lower bound null, so -50 is allowed
				expect(result.finalValue).toBe(-50);
			});

			it('reject: only checks lower bound when upper is null', () => {
				expect(() =>
					reconcileResourceChange({
						currentValue: 50,
						change: { type: 'amount', amount: -100 },
						bounds: { lowerBound: 0, upperBound: null },
						reconciliationMode: 'reject',
					}),
				).toThrow(ResourceBoundExceededError);
			});
		});

		describe('zero deltas', () => {
			it('clamp: zero delta produces no change', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 50);

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'amount', amount: 0 },
						reconciliation: 'clamp',
					},
				};

				resourceAddV2(effect, ctx.context);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(50);
			});

			it('pass: zero delta produces no change', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 50);

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'amount', amount: 0 },
						reconciliation: 'pass',
					},
				};

				resourceAddV2(effect, ctx.context);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(50);
			});

			it('reject: zero delta succeeds (no bound violation)', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 50);

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'amount', amount: 0 },
						reconciliation: 'reject',
					},
				};

				// Should not throw
				resourceAddV2(effect, ctx.context);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(50);
			});
		});

		describe('percent changes with reconciliation modes', () => {
			it('pass: percent removal can push value negative', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 20);

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'percent', modifiers: [2.0] }, // 200% removal
						reconciliation: 'pass',
					},
				};

				resourceRemoveV2(effect, ctx.context);

				// 20 - (200% of 20) = 20 - 40 = -20
				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(-20);
			});

			it('reject: throws when percent change exceeds bounds', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 20);

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'percent', modifiers: [2.0] }, // 200% removal
						reconciliation: 'reject',
					},
				};

				expect(() => resourceRemoveV2(effect, ctx.context)).toThrow(
					ResourceBoundExceededError,
				);
			});

			it('clamp: percent removal is clamped to lower bound', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 20);

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'percent', modifiers: [2.0] }, // 200% removal
						reconciliation: 'clamp',
					},
				};

				resourceRemoveV2(effect, ctx.context);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(0);
				expect(ctx.active.resourceBoundTouched[ctx.goldId].lower).toBe(true);
			});
		});

		describe('recentResourceGains logging', () => {
			it('pass: logs the full unclamped delta', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 90);
				ctx.context.recentResourceGains = [];

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'amount', amount: 20 },
						reconciliation: 'pass',
					},
				};

				resourceAddV2(effect, ctx.context);

				expect(ctx.context.recentResourceGains).toEqual([
					{ key: ctx.goldId, amount: 20 },
				]);
			});

			it('clamp: logs the clamped delta', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 90);
				ctx.context.recentResourceGains = [];

				const effect: EffectDef = {
					params: {
						resourceId: ctx.goldId,
						change: { type: 'amount', amount: 20 },
						reconciliation: 'clamp',
					},
				};

				resourceAddV2(effect, ctx.context);

				// Only 10 was applied due to clamping (90 + 10 = 100)
				expect(ctx.context.recentResourceGains).toEqual([
					{ key: ctx.goldId, amount: 10 },
				]);
			});
		});

		describe('multiple sequential changes with pass mode', () => {
			it('pass: allows accumulation beyond bounds across multiple effects', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 80);

				// First effect pushes to 110
				resourceAddV2(
					{
						params: {
							resourceId: ctx.goldId,
							change: { type: 'amount', amount: 30 },
							reconciliation: 'pass',
						},
					},
					ctx.context,
				);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(110);

				// Second effect pushes to 150
				resourceAddV2(
					{
						params: {
							resourceId: ctx.goldId,
							change: { type: 'amount', amount: 40 },
							reconciliation: 'pass',
						},
					},
					ctx.context,
				);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(150);
			});

			it('pass: allows recovery from negative values', () => {
				setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.goldId, 10);

				// First effect pushes to -30
				resourceRemoveV2(
					{
						params: {
							resourceId: ctx.goldId,
							change: { type: 'amount', amount: 40 },
							reconciliation: 'pass',
						},
					},
					ctx.context,
				);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(-30);

				// Can add back
				resourceAddV2(
					{
						params: {
							resourceId: ctx.goldId,
							change: { type: 'amount', amount: 50 },
							reconciliation: 'clamp', // Back to clamp mode
						},
					},
					ctx.context,
				);

				expect(getResourceValue(ctx.active, ctx.goldId)).toBe(20);
			});
		});
	});

	describe('ResourceBoundExceededError properties', () => {
		it('has correct name property', () => {
			try {
				reconcileResourceChange({
					currentValue: 50,
					change: { type: 'amount', amount: 100 },
					bounds: { lowerBound: 0, upperBound: 80 },
					reconciliationMode: 'reject',
				});
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).name).toBe('ResourceBoundExceededError');
			}
		});

		it('message includes target value and bound for upper violation', () => {
			try {
				reconcileResourceChange({
					currentValue: 50,
					change: { type: 'amount', amount: 100 },
					bounds: { lowerBound: 0, upperBound: 80 },
					reconciliationMode: 'reject',
				});
				expect.fail('Should have thrown');
			} catch (error) {
				const msg = (error as Error).message;
				expect(msg).toContain('150'); // target value
				expect(msg).toContain('80'); // bound value
				expect(msg).toContain('above'); // direction
				expect(msg).toContain('upper'); // bound type
			}
		});

		it('message includes target value and bound for lower violation', () => {
			try {
				reconcileResourceChange({
					currentValue: 10,
					change: { type: 'amount', amount: -30 },
					bounds: { lowerBound: 0, upperBound: 80 },
					reconciliationMode: 'reject',
				});
				expect.fail('Should have thrown');
			} catch (error) {
				const msg = (error as Error).message;
				expect(msg).toContain('-20'); // target value
				expect(msg).toContain('0'); // bound value
				expect(msg).toContain('below'); // direction
				expect(msg).toContain('lower'); // bound type
			}
		});
	});
});
