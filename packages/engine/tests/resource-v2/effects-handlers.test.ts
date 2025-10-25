import { describe, it, beforeEach, expect, vi } from 'vitest';
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
	resourceV2Transfer,
	resourceV2IncreaseUpperBound,
	type ResourceV2TransferEffectParams,
	type ResourceV2UpperBoundIncreaseParams,
} from '../../src/resource-v2/effects/transfer.ts';
import {
	resourceV2Definition,
	resourceV2GroupDefinition,
	createResourceV2Registries,
} from '@kingdom-builder/testing/factories/resourceV2';

vi.mock('@kingdom-builder/contents/happinessHelpers', () => ({
	happinessTierId: (slug: string) => `mock-happiness-tier:${slug}`,
	happinessPassiveId: (slug: string) => `mock-happiness-passive:${slug}`,
	happinessModifierId: (slug: string, kind: string) =>
		`mock-happiness:${slug}:${kind}`,
	incomeModifier: () => ({ type: 'mock-income' }),
	actionDiscountModifier: () => ({ type: 'mock-discount' }),
	growthBonusEffect: (amount: number) => ({ type: 'mock-growth', amount }),
	createTierPassiveEffect: () => ({ type: 'mock-tier-passive' }),
}));

vi.mock('@kingdom-builder/contents/resources', () => ({
	Resource: {},
	RESOURCES: {},
	getResourceV2Id: (key: string) => key,
}));

vi.mock('@kingdom-builder/contents/stats', () => ({
	Stat: {},
	STATS: {},
	getStatResourceV2Id: (key: string) => key,
}));

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
	const group = resourceV2GroupDefinition({
		id: 'group-stockpile',
		parent: {
			lowerBound: 0,
			upperBound: 30,
			tierTrack,
		},
	});

	const ore = resourceV2Definition({
		id: 'resource-ore',
		metadata: { group: { id: group.id } },
		bounds: { lowerBound: 2, upperBound: 9 },
		tierTrack,
	});

	const vault = resourceV2Definition({
		id: 'resource-vault',
		metadata: { group: { id: group.id } },
		bounds: { lowerBound: 0, upperBound: 5 },
		tierTrack,
	});

	const registries = createResourceV2Registries({
		resources: [ore, vault],
		groups: [group],
	});

	const catalog = createRuntimeResourceCatalog(registries);

	const active = new PlayerState('A', 'Active Tester');
	const opponent = new PlayerState('B', 'Opponent Tester');
	initialisePlayerResourceState(active, catalog);
	initialisePlayerResourceState(opponent, catalog);

	const baseContext = {
		game: { resourceCatalogV2: catalog },
		recentResourceGains: [] as { key: string; amount: number }[],
		activePlayer: active,
		opponent,
	} as unknown as EngineContext;

	(
		baseContext as EngineContext & { resourceCatalogV2?: typeof catalog }
	).resourceCatalogV2 = catalog;

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

describe('ResourceV2 effect handlers', () => {
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

		resourceAddV2(effect, ctx.context);

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
			{ key: ctx.oreId, amount: 7 },
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

		resourceRemoveV2(effect, ctx.context);

		expect(getResourceValue(ctx.active, ctx.oreId)).toBe(2);
		expect(ctx.active.resourceBoundTouched[ctx.oreId]).toEqual({
			lower: true,
			upper: false,
		});
		expect(ctx.context.recentResourceGains.at(-1)).toEqual({
			key: ctx.oreId,
			amount: -3,
		});
		expect(ctx.active.resourceTierIds[ctx.oreId]).toBe('tier-low');
	});

	it('transfers the minimum reconciled amount between players and honours options', () => {
		setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.oreId, 7, {
			suppressTouched: true,
			suppressRecentEntry: true,
		});
		setResourceValue(ctx.context, ctx.opponent, ctx.catalog, ctx.vaultId, 1, {
			suppressTouched: true,
			suppressRecentEntry: true,
		});
		ctx.context.recentResourceGains.length = 0;

		const effect: EffectDef<ResourceV2TransferEffectParams> = {
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
						suppressTouched: true,
						suppressRecentEntry: true,
						skipTierUpdate: true,
					},
				},
			},
		};

		resourceV2Transfer(effect, ctx.context);

		expect(getResourceValue(ctx.active, ctx.oreId)).toBe(3);
		expect(getResourceValue(ctx.opponent, ctx.vaultId)).toBe(5);
		expect(ctx.context.recentResourceGains).toEqual([
			{ key: ctx.oreId, amount: -4 },
		]);
		expect(ctx.active.resourceTouched[ctx.oreId]).toBe(true);
		expect(ctx.opponent.resourceTouched[ctx.vaultId]).toBe(false);
		expect(ctx.opponent.resourceTierIds[ctx.vaultId]).toBe('tier-low');
	});

	it('rejects transfer payloads that request unsupported reconciliation modes', () => {
		const effect: EffectDef<ResourceV2TransferEffectParams> = {
			params: {
				donor: {
					resourceId: ctx.oreId,
					change: { type: 'amount', amount: -1 },
					reconciliationMode: 'reject',
				},
				recipient: {
					resourceId: ctx.vaultId,
					change: { type: 'amount', amount: 1 },
				},
			},
		};

		expect(() => resourceV2Transfer(effect, ctx.context)).toThrowError(
			`ResourceV2 effect for "${ctx.oreId}" only supports clamp reconciliation during MVP scope (received "reject").`,
		);
	});

	it('raises resource upper bounds through the dedicated handler', () => {
		const effect: EffectDef<ResourceV2UpperBoundIncreaseParams> = {
			params: {
				resourceId: ctx.oreId,
				delta: 4,
			},
		};

		resourceV2IncreaseUpperBound(effect, ctx.context);

		expect(ctx.active.resourceUpperBounds[ctx.oreId]).toBe(13);
		expect(ctx.active.resourceBoundTouched[ctx.oreId]).toEqual({
			lower: false,
			upper: true,
		});
		expect(ctx.context.recentResourceGains).toHaveLength(0);
	});
});
