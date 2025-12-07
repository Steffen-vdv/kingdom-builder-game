import { describe, it, beforeEach, expect } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../../src/context.ts';
import { PlayerState } from '../../src/state/index.ts';
import {
	createRuntimeResourceCatalog,
	initialisePlayerResourceState,
	setResourceValue,
	getResourceValue,
} from '../../src/resource/index.ts';
import {
	resourceAdd,
	resourceRemove,
} from '../../src/resource/effects/addRemove.ts';
import {
	resourceTransfer,
	resourceIncreaseUpperBound,
	type ResourceTransferEffectParams,
	type ResourceUpperBoundIncreaseParams,
} from '../../src/resource/effects/transfer.ts';
import {
	resourceDefinition,
	resourceGroupDefinition,
	createResourceRegistries,
} from '@kingdom-builder/testing';

const tierTrack = {
	metadata: {
		id: 'handler-track',
		label: 'Handler Track',
	},
	tiers: [
		{ id: 'tier-low', label: 'Low', threshold: { max: 2 } },
		{ id: 'tier-mid', label: 'Mid', threshold: { min: 3, max: 6 } },
		{ id: 'tier-high', label: 'High', threshold: { min: 7 } },
	],
} as const;

interface TestContext {
	context: EngineContext;
	active: PlayerState;
	opponent: PlayerState;
	oreId: string;
	vaultId: string;
	parentId: string;
	catalog: ReturnType<typeof createRuntimeResourceCatalog>;
}

function createTestContext(): TestContext {
	const group = resourceGroupDefinition({
		id: 'group-stockpile',
		parent: {
			lowerBound: 0,
			upperBound: 30,
			tierTrack,
		},
	});

	const ore = resourceDefinition({
		id: 'resource-ore',
		metadata: { group: { id: group.id } },
		bounds: { lowerBound: 2, upperBound: 9 },
		tierTrack,
	});

	const vault = resourceDefinition({
		id: 'resource-vault',
		metadata: { group: { id: group.id } },
		bounds: { lowerBound: 0, upperBound: 5 },
		tierTrack,
	});

	const registries = createResourceRegistries({
		resources: [ore, vault],
		groups: [group],
	});

	const catalog = createRuntimeResourceCatalog(registries);

	const active = new PlayerState('A', 'Active Tester');
	const opponent = new PlayerState('B', 'Opponent Tester');
	initialisePlayerResourceState(active, catalog);
	initialisePlayerResourceState(opponent, catalog);

	const baseContext = {
		game: { resourceCatalog: catalog },
		resourceCatalog: catalog,
		recentResourceGains: [] as { resourceId: string; amount: number }[],
		activePlayer: active,
		opponent,
	} as unknown as EngineContext;

	return {
		context: baseContext,
		active,
		opponent,
		oreId: ore.id,
		vaultId: vault.id,
		parentId: group.parent!.id,
		catalog,
	};
}

describe('Resource effect handlers', () => {
	let ctx: TestContext;

	beforeEach(() => {
		ctx = createTestContext();
	});

	it('applies additive gains, clamps to the upper bound, and logs signed deltas', () => {
		const effect: EffectDef = {
			params: {
				resourceId: ctx.oreId,
				change: { type: 'amount', amount: 15 },
			},
		} satisfies EffectDef;

		resourceAdd(effect, ctx.context);

		expect(getResourceValue(ctx.active, ctx.oreId)).toBe(9);
		expect(ctx.active.resourceBoundTouched[ctx.oreId]).toEqual({
			lower: false,
			upper: true,
		});
		expect(ctx.active.resourceTouched[ctx.oreId]).toBe(true);
		expect(ctx.active.resourceTierIds[ctx.oreId]).toBe('tier-high');
		expect(ctx.active.resourceValues[ctx.parentId]).toBe(9);
		expect(ctx.active.resourceTouched[ctx.parentId]).toBe(true);
		expect(ctx.context.recentResourceGains).toEqual([
			{ resourceId: ctx.oreId, amount: 7 },
		]);
	});

	it('applies removals with percent rounding and clamps to the lower bound', () => {
		setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.oreId, 5);

		const effect: EffectDef = {
			params: {
				resourceId: ctx.oreId,
				change: { type: 'percent', modifiers: [0.8] },
			},
		} satisfies EffectDef;

		resourceRemove(effect, ctx.context);

		expect(getResourceValue(ctx.active, ctx.oreId)).toBe(2);
		expect(ctx.active.resourceBoundTouched[ctx.oreId]).toEqual({
			lower: true,
			upper: false,
		});
		expect(ctx.context.recentResourceGains.at(-1)).toEqual({
			resourceId: ctx.oreId,
			amount: -3,
		});
		expect(ctx.active.resourceTierIds[ctx.oreId]).toBe('tier-low');
	});

	it('transfers the minimum reconciled amount between players and honours options', () => {
		setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.oreId, 7, {
			suppressRecentEntry: true,
		});
		setResourceValue(ctx.context, ctx.opponent, ctx.catalog, ctx.vaultId, 1, {
			suppressRecentEntry: true,
		});
		ctx.context.recentResourceGains.length = 0;

		const effect: EffectDef<ResourceTransferEffectParams> = {
			params: {
				donor: {
					resourceId: ctx.oreId,
					change: { type: 'amount', amount: -6 },
				},
				recipient: {
					player: 'opponent',
					resourceId: ctx.vaultId,
					change: { type: 'amount', amount: 6 },
					options: {
						suppressRecentEntry: true,
						skipTierUpdate: true,
					},
				},
			},
		};

		resourceTransfer(effect, ctx.context);

		expect(getResourceValue(ctx.active, ctx.oreId)).toBe(3);
		expect(getResourceValue(ctx.opponent, ctx.vaultId)).toBe(5);
		expect(ctx.context.recentResourceGains).toEqual([
			{ resourceId: ctx.oreId, amount: -4 },
		]);
		// Both are touched because their final values are non-zero
		expect(ctx.active.resourceTouched[ctx.oreId]).toBe(true);
		expect(ctx.opponent.resourceTouched[ctx.vaultId]).toBe(true);
		expect(ctx.opponent.resourceTierIds[ctx.vaultId]).toBe('tier-low');
	});

	it('raises resource upper bounds through the dedicated handler', () => {
		const effect: EffectDef<ResourceUpperBoundIncreaseParams> = {
			params: {
				resourceId: ctx.oreId,
				delta: 4,
			},
		};

		resourceIncreaseUpperBound(effect, ctx.context);

		expect(ctx.active.resourceUpperBounds[ctx.oreId]).toBe(13);
		expect(ctx.active.resourceBoundTouched[ctx.oreId]).toEqual({
			lower: false,
			upper: true,
		});
		expect(ctx.context.recentResourceGains).toHaveLength(0);
	});
});
