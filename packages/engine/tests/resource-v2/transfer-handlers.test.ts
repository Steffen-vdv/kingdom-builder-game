import { beforeEach, describe, expect, it } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../../src/context.ts';
import { PlayerState } from '../../src/state/index.ts';
import {
	createRuntimeResourceCatalog,
	getResourceValue,
	initialisePlayerResourceState,
	setResourceValue,
} from '../../src/resource-v2/index.ts';
import {
	resourceV2Transfer,
	type ResourceV2TransferEffectParams,
} from '../../src/resource-v2/effects/transfer.ts';
import {
	resourceV2Definition,
	resourceV2GroupDefinition,
	createResourceV2Registries,
} from '@kingdom-builder/testing';

const tierTrack = {
	metadata: {
		id: 'track:transfer',
		label: 'Transfer Track',
	},
	tiers: [
		{
			id: 'tier:low',
			label: 'Low',
			threshold: { max: 2 },
			enterEffects: [],
			exitEffects: [],
		},
		{
			id: 'tier:mid',
			label: 'Mid',
			threshold: { min: 3, max: 6 },
			enterEffects: [],
			exitEffects: [],
		},
		{
			id: 'tier:high',
			label: 'High',
			threshold: { min: 7 },
			enterEffects: [],
			exitEffects: [],
		},
	],
} as const;

interface TestContext {
	context: EngineContext;
	active: PlayerState;
	opponent: PlayerState;
	donorId: string;
	recipientId: string;
	parentId: string;
	catalog: ReturnType<typeof createRuntimeResourceCatalog>;
}

function createTestContext(): TestContext {
	const group = resourceV2GroupDefinition({
		id: 'group:exchange',
		order: 1,
		parent: {
			id: 'resource:exchange-parent',
			label: 'Exchange Parent',
			icon: 'icon:parent',
			lowerBound: 0,
			upperBound: 60,
			tierTrack,
		},
	});

	const donor = resourceV2Definition({
		id: 'resource:donor',
		metadata: {
			label: 'Donor',
			icon: 'icon:donor',
			group: { id: group.id },
		},
		bounds: { lowerBound: 0, upperBound: 25 },
		tierTrack,
	});

	const recipient = resourceV2Definition({
		id: 'resource:recipient',
		metadata: {
			label: 'Recipient',
			icon: 'icon:recipient',
			group: { id: group.id },
		},
		bounds: { lowerBound: 0, upperBound: 10 },
		tierTrack,
	});

	const registries = createResourceV2Registries({
		resources: [donor, recipient],
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
		activePlayer: active,
		opponent,
		recentResourceGains: [] as { key: string; amount: number }[],
	} as unknown as EngineContext;

	return {
		context: baseContext,
		active,
		opponent,
		donorId: donor.id,
		recipientId: recipient.id,
		parentId: group.parent!.id,
		catalog,
	};
}

describe('ResourceV2 transfer effect handler', () => {
	let ctx: TestContext;

	beforeEach(() => {
		ctx = createTestContext();
	});

	it('clamps donor removals and recipient gains to the available bounds', () => {
		setResourceValue(ctx.context, ctx.opponent, ctx.catalog, ctx.donorId, 12, {
			suppressTouched: true,
			suppressRecentEntry: true,
		});
		setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.recipientId, 6, {
			suppressTouched: true,
			suppressRecentEntry: true,
		});
		ctx.context.recentResourceGains.length = 0;

		const effect: EffectDef<ResourceV2TransferEffectParams> = {
			params: {
				donor: {
					player: 'opponent',
					resourceId: ctx.donorId,
					change: { type: 'amount', amount: -20 },
				},
				recipient: {
					resourceId: ctx.recipientId,
					change: { type: 'amount', amount: 6 },
				},
			},
		};

		resourceV2Transfer(effect, ctx.context);

		expect(getResourceValue(ctx.opponent, ctx.donorId)).toBe(8);
		expect(getResourceValue(ctx.active, ctx.recipientId)).toBe(10);
		expect(ctx.opponent.resourceTouched[ctx.donorId]).toBe(true);
		expect(ctx.active.resourceTouched[ctx.recipientId]).toBe(true);
		expect(ctx.active.resourceTierIds[ctx.recipientId]).toBe('tier:high');
		expect(ctx.opponent.resourceTierIds[ctx.donorId]).toBe('tier:high');
		expect(ctx.context.recentResourceGains).toEqual([
			{ key: ctx.donorId, amount: -4 },
			{ key: ctx.recipientId, amount: 4 },
		]);
		expect(ctx.active.resourceValues[ctx.parentId]).toBe(10);
		expect(ctx.opponent.resourceValues[ctx.parentId]).toBe(8);
	});

	it('rounds donor percent requests before reconciling transfer amounts', () => {
		const run = (roundingMode?: 'up' | 'down' | 'nearest') => {
			setResourceValue(ctx.context, ctx.opponent, ctx.catalog, ctx.donorId, 5, {
				suppressTouched: true,
				suppressRecentEntry: true,
			});
			setResourceValue(
				ctx.context,
				ctx.active,
				ctx.catalog,
				ctx.recipientId,
				0,
				{
					suppressTouched: true,
					suppressRecentEntry: true,
				},
			);
			ctx.context.recentResourceGains.length = 0;

			const effect: EffectDef<ResourceV2TransferEffectParams> = {
				params: {
					donor: {
						player: 'opponent',
						resourceId: ctx.donorId,
						change: {
							type: 'percent',
							modifiers: [0.25],
							roundingMode,
						},
					},
					recipient: {
						resourceId: ctx.recipientId,
						change: { type: 'amount', amount: 10 },
					},
				},
			};

			resourceV2Transfer(effect, ctx.context);

			return {
				donor: getResourceValue(ctx.opponent, ctx.donorId),
				recipient: getResourceValue(ctx.active, ctx.recipientId),
				gains: ctx.context.recentResourceGains.map((entry) => ({ ...entry })),
			};
		};

		const nearest = run();
		expect(nearest.donor).toBe(4);
		expect(nearest.recipient).toBe(1);
		expect(nearest.gains).toEqual([
			{ key: ctx.donorId, amount: -1 },
			{ key: ctx.recipientId, amount: 1 },
		]);

		const roundedUp = run('up');
		expect(roundedUp.donor).toBe(3);
		expect(roundedUp.recipient).toBe(2);

		const roundedDown = run('down');
		expect(roundedDown.donor).toBe(4);
		expect(roundedDown.recipient).toBe(1);
	});

	it('honours endpoint options for touched flags, logging, and tier updates', () => {
		const initialTier = ctx.active.resourceTierIds[ctx.recipientId];
		setResourceValue(ctx.context, ctx.opponent, ctx.catalog, ctx.donorId, 6, {
			suppressTouched: true,
			suppressRecentEntry: true,
		});
		setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.recipientId, 1, {
			suppressTouched: true,
			suppressRecentEntry: true,
		});
		ctx.context.recentResourceGains.length = 0;

		const effect: EffectDef<ResourceV2TransferEffectParams> = {
			params: {
				donor: {
					player: 'opponent',
					resourceId: ctx.donorId,
					change: { type: 'amount', amount: -4 },
					options: {
						suppressTouched: true,
						suppressRecentEntry: true,
					},
				},
				recipient: {
					resourceId: ctx.recipientId,
					change: { type: 'amount', amount: 4 },
					options: {
						skipTierUpdate: true,
					},
				},
			},
		};

		resourceV2Transfer(effect, ctx.context);

		expect(getResourceValue(ctx.opponent, ctx.donorId)).toBe(2);
		expect(getResourceValue(ctx.active, ctx.recipientId)).toBe(5);
		expect(ctx.opponent.resourceTouched[ctx.donorId]).toBe(false);
		expect(ctx.context.recentResourceGains).toEqual([
			{ key: ctx.recipientId, amount: 4 },
		]);
		expect(ctx.active.resourceTierIds[ctx.recipientId]).toBe(initialTier);
	});

	it('skips processing when donor and recipient reference the same player resource', () => {
		setResourceValue(ctx.context, ctx.active, ctx.catalog, ctx.recipientId, 5, {
			suppressTouched: true,
			suppressRecentEntry: true,
		});
		ctx.context.recentResourceGains.length = 0;

		const effect: EffectDef<ResourceV2TransferEffectParams> = {
			params: {
				donor: {
					resourceId: ctx.recipientId,
					change: { type: 'amount', amount: -5 },
				},
				recipient: {
					resourceId: ctx.recipientId,
					change: { type: 'amount', amount: 5 },
				},
			},
		};

		resourceV2Transfer(effect, ctx.context);

		expect(getResourceValue(ctx.active, ctx.recipientId)).toBe(5);
		expect(ctx.context.recentResourceGains).toHaveLength(0);
	});
});
