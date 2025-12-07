import { describe, it, expect, beforeEach } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../../src/context.ts';
import { PlayerState } from '../../src/state/index.ts';
import {
	createRuntimeResourceCatalog,
	initialisePlayerResourceState,
	setResourceValue,
	getResourceValue,
	resolveBoundValue,
} from '../../src/resource-v2/index.ts';
import {
	resourceAddV2,
	resourceRemoveV2,
} from '../../src/resource-v2/effects/addRemove.ts';
import { ResourceBoundExceededError } from '../../src/resource-v2/reconciliation.ts';
import {
	resourceV2Definition,
	resourceV2GroupDefinition,
	createResourceV2Registries,
	boundRef,
} from '@kingdom-builder/testing';

interface TestContext {
	context: EngineContext;
	active: PlayerState;
	opponent: PlayerState;
	catalog: ReturnType<typeof createRuntimeResourceCatalog>;
}

/**
 * Comprehensive tests for dynamic resource bounds.
 *
 * The dynamic bounds system allows resources to have bounds that reference
 * the value of another resource, enabling patterns like:
 * - Population bounded by max-population
 * - Army size bounded by population count
 * - Expenditure bounded by income
 */
describe('Dynamic resource bounds', () => {
	describe('resolveBoundValue helper', () => {
		it('returns null for null bound', () => {
			expect(resolveBoundValue(null, {})).toBe(null);
		});

		it('returns null for undefined bound', () => {
			expect(resolveBoundValue(undefined, {})).toBe(null);
		});

		it('returns static number directly', () => {
			expect(resolveBoundValue(100, {})).toBe(100);
		});

		it('returns zero for static zero bound', () => {
			expect(resolveBoundValue(0, {})).toBe(0);
		});

		it('returns negative number for static negative bound', () => {
			expect(resolveBoundValue(-50, {})).toBe(-50);
		});

		it('resolves bound reference to referenced resource value', () => {
			const resourceValues = { 'max-population': 10 };
			const boundRef = { resourceId: 'max-population' };
			expect(resolveBoundValue(boundRef, resourceValues)).toBe(10);
		});

		it('returns null when referenced resource does not exist', () => {
			const resourceValues = { 'other-resource': 5 };
			const boundRef = { resourceId: 'missing-resource' };
			expect(resolveBoundValue(boundRef, resourceValues)).toBe(null);
		});

		it('resolves zero value from referenced resource', () => {
			const resourceValues = { 'max-population': 0 };
			const boundRef = { resourceId: 'max-population' };
			expect(resolveBoundValue(boundRef, resourceValues)).toBe(0);
		});

		it('ignores reconciliation field when resolving value', () => {
			const resourceValues = { 'max-population': 15 };
			const boundRef = {
				resourceId: 'max-population',
				reconciliation: 'reject',
			};
			expect(resolveBoundValue(boundRef, resourceValues)).toBe(15);
		});
	});

	describe('initialization with dynamic bounds', () => {
		it('initializes resource bounded by another resource value', () => {
			const maxPopId = 'stat-max-population';
			const populationId = 'resource-population';

			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 1, upperBound: 100 },
			});

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const player = new PlayerState('A', 'Test Player');
			initialisePlayerResourceState(player, catalog);

			// Max population initializes to clamped zero (or lower bound)
			expect(player.resourceValues[maxPopId]).toBe(1);
			// Population initializes, but bound resolves based on max-pop at init
			// Since max-pop starts at 1, population is bounded by 1
			expect(player.resourceValues[populationId]).toBe(0);
		});

		it('handles circular bound references gracefully at init', () => {
			// This tests what happens when two resources reference each other
			// The system should not infinite loop - it uses current values at
			// resolution time
			const resourceA = resourceV2Definition({
				id: 'resource-a',
				bounds: { upperBound: boundRef('resource-b') },
			});

			const resourceB = resourceV2Definition({
				id: 'resource-b',
				bounds: { upperBound: boundRef('resource-a') },
			});

			const registries = createResourceV2Registries({
				resources: [resourceA, resourceB],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const player = new PlayerState('A', 'Test Player');

			// Should not throw or infinite loop
			expect(() => {
				initialisePlayerResourceState(player, catalog);
			}).not.toThrow();
		});
	});

	describe('clamp mode with dynamic bounds', () => {
		let ctx: TestContext;
		const maxPopId = 'stat-max-population';
		const populationId = 'resource-population';

		beforeEach(() => {
			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population],
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

			ctx = { context: baseContext, active, opponent, catalog };
		});

		it('verifies catalog has bound reference preserved', () => {
			const popDef = ctx.catalog.resources.byId[populationId];
			expect(popDef.upperBound).toEqual({
				resourceId: maxPopId,
				reconciliation: 'clamp',
			});
		});

		it('clamps to dynamic upper bound when exceeded', () => {
			// Set max population to 10
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 10);
			// Set population to 5
			setResourceValue(ctx.context, ctx.active, ctx.catalog, populationId, 5);

			// Try to add 10, should clamp to max of 10
			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'amount', amount: 10 },
					reconciliation: 'clamp',
				},
			};

			resourceAddV2(effect, ctx.context);

			expect(getResourceValue(ctx.active, populationId)).toBe(10);
			expect(ctx.active.resourceBoundTouched[populationId].upper).toBe(true);
		});

		it('uses current bound resource value at time of clamping', () => {
			// Set max population to 5
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 5);
			// Set population to 3
			setResourceValue(ctx.context, ctx.active, ctx.catalog, populationId, 3);

			// Now increase max population to 20
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 20);

			// Add 15 to population - should now allow up to 20
			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'amount', amount: 15 },
					reconciliation: 'clamp',
				},
			};

			resourceAddV2(effect, ctx.context);

			// 3 + 15 = 18, which is within new max of 20
			expect(getResourceValue(ctx.active, populationId)).toBe(18);
		});

		it('cascades reconciliation when bound resource decreases', () => {
			// Set max population to 20
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 20);
			// Set population to 15
			setResourceValue(ctx.context, ctx.active, ctx.catalog, populationId, 15);

			// Now decrease max population to 10
			// With cascading reconciliation, population is automatically clamped
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 10);

			// Population is automatically clamped to the new bound of 10
			expect(getResourceValue(ctx.active, populationId)).toBe(10);

			// Further operations still respect the bound
			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'amount', amount: 5 },
					reconciliation: 'clamp',
				},
			};

			resourceAddV2(effect, ctx.context);

			// Already at max, so stays at 10
			expect(getResourceValue(ctx.active, populationId)).toBe(10);
		});
	});

	describe('reject mode with dynamic bounds', () => {
		let ctx: TestContext;
		const maxPopId = 'stat-max-population';
		const populationId = 'resource-population';

		beforeEach(() => {
			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population],
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

			ctx = { context: baseContext, active, opponent, catalog };
		});

		it('throws when exceeding dynamic upper bound', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 10);
			setResourceValue(ctx.context, ctx.active, ctx.catalog, populationId, 8);

			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'amount', amount: 5 },
					reconciliation: 'reject',
				},
			};

			expect(() => resourceAddV2(effect, ctx.context)).toThrow(
				ResourceBoundExceededError,
			);
			expect(getResourceValue(ctx.active, populationId)).toBe(8);
		});

		it('succeeds when staying within dynamic bound', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 10);
			setResourceValue(ctx.context, ctx.active, ctx.catalog, populationId, 5);

			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'amount', amount: 3 },
					reconciliation: 'reject',
				},
			};

			resourceAddV2(effect, ctx.context);
			expect(getResourceValue(ctx.active, populationId)).toBe(8);
		});

		it('allows landing exactly on dynamic bound', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 10);
			setResourceValue(ctx.context, ctx.active, ctx.catalog, populationId, 7);

			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'amount', amount: 3 },
					reconciliation: 'reject',
				},
			};

			resourceAddV2(effect, ctx.context);
			expect(getResourceValue(ctx.active, populationId)).toBe(10);
		});

		it('error contains resolved bound value', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 7);
			setResourceValue(ctx.context, ctx.active, ctx.catalog, populationId, 5);

			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'amount', amount: 10 },
					reconciliation: 'reject',
				},
			};

			try {
				resourceAddV2(effect, ctx.context);
				expect.fail('Should have thrown ResourceBoundExceededError');
			} catch (error) {
				expect(error).toBeInstanceOf(ResourceBoundExceededError);
				const boundError = error as ResourceBoundExceededError;
				expect(boundError.boundValue).toBe(7); // The resolved dynamic bound
				expect(boundError.targetValue).toBe(15); // 5 + 10
			}
		});
	});

	describe('pass mode with dynamic bounds', () => {
		let ctx: TestContext;
		const maxPopId = 'stat-max-population';
		const populationId = 'resource-population';

		beforeEach(() => {
			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population],
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

			ctx = { context: baseContext, active, opponent, catalog };
		});

		it('allows exceeding dynamic upper bound with pass mode', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 10);
			setResourceValue(ctx.context, ctx.active, ctx.catalog, populationId, 8);

			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'amount', amount: 10 },
					reconciliation: 'pass',
				},
			};

			resourceAddV2(effect, ctx.context);
			expect(getResourceValue(ctx.active, populationId)).toBe(18);
		});

		it('allows going below dynamic lower bound with pass mode', () => {
			// Setup a resource with dynamic lower bound
			const minGoldId = 'stat-min-gold';
			const goldId = 'resource-gold';

			const minGold = resourceV2Definition({
				id: minGoldId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const gold = resourceV2Definition({
				id: goldId,
				bounds: {
					lowerBound: boundRef(minGoldId),
					upperBound: 1000,
				},
			});

			const registries = createResourceV2Registries({
				resources: [minGold, gold],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active');
			initialisePlayerResourceState(active, catalog);

			const baseContext = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// Set min gold to 10
			setResourceValue(baseContext, active, catalog, minGoldId, 10);
			// Set gold to 20
			setResourceValue(baseContext, active, catalog, goldId, 20);

			// Remove 15 with pass mode - should allow going to 5 (below min of 10)
			const effect: EffectDef = {
				params: {
					resourceId: goldId,
					change: { type: 'amount', amount: 15 },
					reconciliation: 'pass',
				},
			};

			resourceRemoveV2(effect, baseContext);
			expect(getResourceValue(active, goldId)).toBe(5);
		});
	});

	describe('dynamic lower bound', () => {
		let ctx: TestContext;
		const minGoldId = 'stat-min-gold';
		const goldId = 'resource-gold';

		beforeEach(() => {
			const minGold = resourceV2Definition({
				id: minGoldId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const gold = resourceV2Definition({
				id: goldId,
				bounds: {
					lowerBound: boundRef(minGoldId),
					upperBound: 1000,
				},
			});

			const registries = createResourceV2Registries({
				resources: [minGold, gold],
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

			ctx = { context: baseContext, active, opponent, catalog };
		});

		it('clamps to dynamic lower bound when going below', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, minGoldId, 10);
			setResourceValue(ctx.context, ctx.active, ctx.catalog, goldId, 20);

			const effect: EffectDef = {
				params: {
					resourceId: goldId,
					change: { type: 'amount', amount: 15 },
					reconciliation: 'clamp',
				},
			};

			resourceRemoveV2(effect, ctx.context);

			expect(getResourceValue(ctx.active, goldId)).toBe(10);
			expect(ctx.active.resourceBoundTouched[goldId].lower).toBe(true);
		});

		it('rejects when going below dynamic lower bound', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, minGoldId, 10);
			setResourceValue(ctx.context, ctx.active, ctx.catalog, goldId, 15);

			const effect: EffectDef = {
				params: {
					resourceId: goldId,
					change: { type: 'amount', amount: 10 },
					reconciliation: 'reject',
				},
			};

			expect(() => resourceRemoveV2(effect, ctx.context)).toThrow(
				ResourceBoundExceededError,
			);
			expect(getResourceValue(ctx.active, goldId)).toBe(15);
		});
	});

	describe('edge cases', () => {
		it('handles missing bound resource (resolves to null/unbounded)', () => {
			const populationId = 'resource-population';

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef('nonexistent-resource'),
				},
			});

			const registries = createResourceV2Registries({
				resources: [population],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active Player');
			initialisePlayerResourceState(active, catalog);

			const baseContext = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// With null upper bound (missing resource), there's no upper limit
			setResourceValue(baseContext, active, catalog, populationId, 100);

			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'amount', amount: 1000 },
					reconciliation: 'clamp',
				},
			};

			resourceAddV2(effect, baseContext);

			// Should allow any value since upper bound resolves to null
			expect(getResourceValue(active, populationId)).toBe(1100);
		});

		it('handles dynamic bound that evaluates to zero', () => {
			const maxPopId = 'stat-max-population';
			const populationId = 'resource-population';

			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active Player');
			initialisePlayerResourceState(active, catalog);

			const baseContext = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// Set max population to 0 - this means population is bounded to 0
			setResourceValue(baseContext, active, catalog, maxPopId, 0);

			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'amount', amount: 5 },
					reconciliation: 'clamp',
				},
			};

			resourceAddV2(effect, baseContext);

			// Clamped to upper bound of 0
			expect(getResourceValue(active, populationId)).toBe(0);
		});

		it('handles negative dynamic bound', () => {
			const minGoldId = 'stat-min-gold';
			const goldId = 'resource-gold';

			const minGold = resourceV2Definition({
				id: minGoldId,
				// Allow negative min gold (debt threshold)
				bounds: { lowerBound: -100, upperBound: 0 },
			});

			const gold = resourceV2Definition({
				id: goldId,
				bounds: {
					lowerBound: boundRef(minGoldId),
					upperBound: 1000,
				},
			});

			const registries = createResourceV2Registries({
				resources: [minGold, gold],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active Player');
			initialisePlayerResourceState(active, catalog);

			const baseContext = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// Set min gold to -50 (allow up to 50 debt)
			setResourceValue(baseContext, active, catalog, minGoldId, -50);
			setResourceValue(baseContext, active, catalog, goldId, 10);

			// Try to remove 70 - should clamp to -50
			const effect: EffectDef = {
				params: {
					resourceId: goldId,
					change: { type: 'amount', amount: 70 },
					reconciliation: 'clamp',
				},
			};

			resourceRemoveV2(effect, baseContext);

			expect(getResourceValue(active, goldId)).toBe(-50);
		});
	});

	describe('percent changes with dynamic bounds', () => {
		let ctx: TestContext;
		const maxPopId = 'stat-max-population';
		const populationId = 'resource-population';

		beforeEach(() => {
			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population],
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

			ctx = { context: baseContext, active, opponent, catalog };
		});

		it('clamps percent increase to dynamic bound', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 15);
			setResourceValue(ctx.context, ctx.active, ctx.catalog, populationId, 10);

			// 100% increase would be +10, totaling 20, but max is 15
			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'percent', modifiers: [1.0] },
					reconciliation: 'clamp',
				},
			};

			resourceAddV2(effect, ctx.context);

			expect(getResourceValue(ctx.active, populationId)).toBe(15);
		});

		it('rejects percent increase that exceeds dynamic bound', () => {
			setResourceValue(ctx.context, ctx.active, ctx.catalog, maxPopId, 12);
			setResourceValue(ctx.context, ctx.active, ctx.catalog, populationId, 10);

			// 50% increase = +5, totaling 15, but max is 12
			const effect: EffectDef = {
				params: {
					resourceId: populationId,
					change: { type: 'percent', modifiers: [0.5] },
					reconciliation: 'reject',
				},
			};

			expect(() => resourceAddV2(effect, ctx.context)).toThrow(
				ResourceBoundExceededError,
			);
		});
	});

	describe('group parent with dynamic bounds', () => {
		it('aggregates children respecting dynamic parent bounds', () => {
			const maxTotalPopId = 'stat-max-total-population';
			const groupId = 'group-population';
			const parentId = `${groupId}_parent`;
			const roleAId = 'resource-role-a';
			const roleBId = 'resource-role-b';

			const maxTotalPop = resourceV2Definition({
				id: maxTotalPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const group = resourceV2GroupDefinition({
				id: groupId,
				parent: {
					id: parentId,
					label: 'Total Population',
					icon: '👥',
					lowerBound: 0,
					upperBound: boundRef(maxTotalPopId),
				},
			});

			const roleA = resourceV2Definition({
				id: roleAId,
				metadata: { group: { id: groupId } },
				bounds: { lowerBound: 0, upperBound: 50 },
			});

			const roleB = resourceV2Definition({
				id: roleBId,
				metadata: { group: { id: groupId } },
				bounds: { lowerBound: 0, upperBound: 50 },
			});

			const registries = createResourceV2Registries({
				resources: [maxTotalPop, roleA, roleB],
				groups: [group],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active Player');
			initialisePlayerResourceState(active, catalog);

			const baseContext = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// Set max total population to 10
			setResourceValue(baseContext, active, catalog, maxTotalPopId, 10);

			// Set role A to 4
			setResourceValue(baseContext, active, catalog, roleAId, 4);

			// Set role B to 3
			setResourceValue(baseContext, active, catalog, roleBId, 3);

			// Parent should aggregate: 4 + 3 = 7
			expect(getResourceValue(active, parentId)).toBe(7);
		});
	});

	describe('reconciliation mode on bound reference', () => {
		it('uses bound reference reconciliation mode when specified', () => {
			const maxPopId = 'stat-max-population';
			const populationId = 'resource-population';

			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			// Use a bound reference with explicit reconciliation mode
			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId, 'reject'),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population],
			});

			const catalog = createRuntimeResourceCatalog(registries);

			// Verify the bound reference has reconciliation set
			const popDef = catalog.resources.byId[populationId];
			expect(popDef.upperBound).toEqual({
				resourceId: maxPopId,
				reconciliation: 'reject',
			});
		});
	});

	describe('cascading reconciliation', () => {
		it('clamps dependent when upper bound decreases below value', () => {
			const maxPopId = 'stat-max-population';
			const populationId = 'resource-population';

			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId, 'clamp'),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active Player');
			initialisePlayerResourceState(active, catalog);

			const ctx = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// Set max population to 20, population to 15
			setResourceValue(ctx, active, catalog, maxPopId, 20);
			setResourceValue(ctx, active, catalog, populationId, 15);

			// Decrease max population to 10 - population should be clamped
			setResourceValue(ctx, active, catalog, maxPopId, 10);

			expect(getResourceValue(active, populationId)).toBe(10);
		});

		it('clamps dependent when lower bound increases above value', () => {
			const minGoldId = 'stat-min-gold';
			const goldId = 'resource-gold';

			const minGold = resourceV2Definition({
				id: minGoldId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const gold = resourceV2Definition({
				id: goldId,
				bounds: {
					lowerBound: boundRef(minGoldId, 'clamp'),
					upperBound: 1000,
				},
			});

			const registries = createResourceV2Registries({
				resources: [minGold, gold],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active Player');
			initialisePlayerResourceState(active, catalog);

			const ctx = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// Set min gold to 5, gold to 10
			setResourceValue(ctx, active, catalog, minGoldId, 5);
			setResourceValue(ctx, active, catalog, goldId, 10);

			// Increase min gold to 15 - gold should be clamped up
			setResourceValue(ctx, active, catalog, minGoldId, 15);

			expect(getResourceValue(active, goldId)).toBe(15);
		});

		it('does not cascade when reconciliation mode is pass', () => {
			const maxPopId = 'stat-max-population';
			const populationId = 'resource-population';

			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId, 'pass'),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active Player');
			initialisePlayerResourceState(active, catalog);

			const ctx = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// Set max population to 20, population to 15
			setResourceValue(ctx, active, catalog, maxPopId, 20);
			setResourceValue(ctx, active, catalog, populationId, 15);

			// Decrease max population to 10 - population stays at 15 (pass mode)
			setResourceValue(ctx, active, catalog, maxPopId, 10);

			expect(getResourceValue(active, populationId)).toBe(15);
		});

		it('throws when reconciliation mode is reject and bound violated', () => {
			const maxPopId = 'stat-max-population';
			const populationId = 'resource-population';

			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId, 'reject'),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active Player');
			initialisePlayerResourceState(active, catalog);

			const ctx = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// Set max population to 20, population to 15
			setResourceValue(ctx, active, catalog, maxPopId, 20);
			setResourceValue(ctx, active, catalog, populationId, 15);

			// Decrease max population to 10 - should throw
			expect(() => {
				setResourceValue(ctx, active, catalog, maxPopId, 10);
			}).toThrow(ResourceBoundExceededError);
		});

		it('does not cause infinite loops with chained dependencies', () => {
			// A chain: maxPop -> population -> workforce
			// Decreasing maxPop should cascade but not loop
			const maxPopId = 'stat-max-pop';
			const populationId = 'resource-population';
			const workforceId = 'resource-workforce';

			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId, 'clamp'),
				},
			});

			// Workforce is bounded by population
			const workforce = resourceV2Definition({
				id: workforceId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(populationId, 'clamp'),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population, workforce],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active Player');
			initialisePlayerResourceState(active, catalog);

			const ctx = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// Set up the chain: maxPop=20, population=15, workforce=10
			setResourceValue(ctx, active, catalog, maxPopId, 20);
			setResourceValue(ctx, active, catalog, populationId, 15);
			setResourceValue(ctx, active, catalog, workforceId, 10);

			// Decrease maxPop to 8 - should cascade through population to workforce
			setResourceValue(ctx, active, catalog, maxPopId, 8);

			// All should be clamped appropriately
			expect(getResourceValue(active, maxPopId)).toBe(8);
			expect(getResourceValue(active, populationId)).toBe(8);
			expect(getResourceValue(active, workforceId)).toBe(8);
		});

		it('cascades through multiple dependents', () => {
			const maxPopId = 'stat-max-population';
			const councilId = 'resource-council';
			const legionId = 'resource-legion';

			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const council = resourceV2Definition({
				id: councilId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId, 'clamp'),
				},
			});

			const legion = resourceV2Definition({
				id: legionId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId, 'clamp'),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, council, legion],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active Player');
			initialisePlayerResourceState(active, catalog);

			const ctx = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// Set max population to 20
			setResourceValue(ctx, active, catalog, maxPopId, 20);
			// Set council to 15, legion to 18
			setResourceValue(ctx, active, catalog, councilId, 15);
			setResourceValue(ctx, active, catalog, legionId, 18);

			// Decrease max population to 10 - both should be clamped
			setResourceValue(ctx, active, catalog, maxPopId, 10);

			expect(getResourceValue(active, councilId)).toBe(10);
			expect(getResourceValue(active, legionId)).toBe(10);
		});

		it('does not cascade when value already within new bound', () => {
			const maxPopId = 'stat-max-population';
			const populationId = 'resource-population';

			const maxPop = resourceV2Definition({
				id: maxPopId,
				bounds: { lowerBound: 0, upperBound: 100 },
			});

			const population = resourceV2Definition({
				id: populationId,
				bounds: {
					lowerBound: 0,
					upperBound: boundRef(maxPopId, 'clamp'),
				},
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, population],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const active = new PlayerState('A', 'Active Player');
			initialisePlayerResourceState(active, catalog);

			const ctx = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: active,
			} as unknown as EngineContext;

			// Set max population to 20, population to 5
			setResourceValue(ctx, active, catalog, maxPopId, 20);
			setResourceValue(ctx, active, catalog, populationId, 5);

			// Decrease max population to 10 - population is 5, still within bound
			setResourceValue(ctx, active, catalog, maxPopId, 10);

			expect(getResourceValue(active, populationId)).toBe(5);
		});
	});

	describe('realistic game scenarios', () => {
		it('population bounded by max-population follows game rules', () => {
			// This simulates the actual game mechanic where population is
			// bounded by max-population stat
			const maxPopId = 'stat:population-max';
			const totalPopId = 'resource:population:total';
			const councilId = 'resource:population:role:council';
			const legionId = 'resource:population:role:legion';
			const groupId = 'group:population';

			const maxPop = resourceV2Definition({
				id: maxPopId,
				metadata: { label: 'Max Population', icon: '👥' },
				bounds: { lowerBound: 1, upperBound: 100 },
			});

			const group = resourceV2GroupDefinition({
				id: groupId,
				parent: {
					id: totalPopId,
					label: 'Total Population',
					icon: '👥',
					lowerBound: 0,
					upperBound: boundRef(maxPopId),
				},
			});

			const council = resourceV2Definition({
				id: councilId,
				metadata: { label: 'Council', icon: '⚖️', group: { id: groupId } },
				bounds: { lowerBound: 0 },
			});

			const legion = resourceV2Definition({
				id: legionId,
				metadata: { label: 'Legion', icon: '⚔️', group: { id: groupId } },
				bounds: { lowerBound: 0 },
			});

			const registries = createResourceV2Registries({
				resources: [maxPop, council, legion],
				groups: [group],
			});

			const catalog = createRuntimeResourceCatalog(registries);
			const player = new PlayerState('A', 'Test Player');
			initialisePlayerResourceState(player, catalog);

			const ctx = {
				game: { resourceCatalogV2: catalog },
				resourceCatalogV2: catalog,
				recentResourceGains: [] as { key: string; amount: number }[],
				activePlayer: player,
			} as unknown as EngineContext;

			// Game starts: set max population to 3
			setResourceValue(ctx, player, catalog, maxPopId, 3);

			// Add 2 council members
			setResourceValue(ctx, player, catalog, councilId, 2);

			// Add 1 legion
			setResourceValue(ctx, player, catalog, legionId, 1);

			// Total should be 3
			expect(getResourceValue(player, totalPopId)).toBe(3);

			// Try to add another legion - parent is already at max
			// The individual role isn't bounded, but the parent aggregate is
			const effect: EffectDef = {
				params: {
					resourceId: legionId,
					change: { type: 'amount', amount: 1 },
					reconciliation: 'clamp',
				},
			};

			// This will add the legion but the parent won't exceed its bound
			resourceAddV2(effect, ctx);

			// Legion is now 2
			expect(getResourceValue(player, legionId)).toBe(2);
			// But total is clamped to 3 (max population)
			expect(getResourceValue(player, totalPopId)).toBe(3);
		});
	});
});
