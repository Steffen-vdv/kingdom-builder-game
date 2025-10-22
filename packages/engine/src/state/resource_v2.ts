import type {
	ResourceV2BoundsMetadata,
	ResourceV2RecentGainEntry,
	ResourceV2TierDefinition,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';
import type { ResourceV2EngineRegistry } from '../resourceV2/registry';

export interface PlayerResourceV2TierState {
	trackId: string;
	tierId?: string;
	nextTierId?: string;
	previousTierId?: string;
}

export interface PlayerResourceV2State {
	readonly resourceIds: ReadonlyArray<string>;
	readonly parentIds: ReadonlyArray<string>;
	readonly amounts: Record<string, number>;
	readonly touched: Record<string, boolean>;
	readonly bounds: Record<string, ResourceV2BoundsMetadata | undefined>;
	readonly tiers: Record<string, PlayerResourceV2TierState | undefined>;
	readonly parentChildren: Record<string, ReadonlyArray<string>>;
	readonly childToParent: Record<string, string | undefined>;
	readonly recentDeltas: Record<string, number>;
}

export function createEmptyPlayerResourceV2State(): PlayerResourceV2State {
	return {
		resourceIds: Object.freeze([] as string[]),
		parentIds: Object.freeze([] as string[]),
		amounts: {},
		touched: {},
		bounds: {},
		tiers: {},
		parentChildren: {},
		childToParent: {},
		recentDeltas: {},
	};
}

export function createPlayerResourceV2State(
	registry: ResourceV2EngineRegistry,
): PlayerResourceV2State {
	const resourceIds = Object.freeze([...registry.resourceIds]);
	const parentIds = Object.freeze([...registry.parentIds]);

	const amounts: Record<string, number> = {};
	const touched: Record<string, boolean> = {};
	const bounds: Record<string, ResourceV2BoundsMetadata | undefined> = {};
	const tiers: Record<string, PlayerResourceV2TierState | undefined> = {};
	const parentChildren: Record<string, ReadonlyArray<string>> = {};
	const childToParent: Record<string, string | undefined> = {};
	const recentDeltas: Record<string, number> = {};

	for (const resourceId of resourceIds) {
		amounts[resourceId] = 0;
		touched[resourceId] = false;
		bounds[resourceId] = registry.getBounds(resourceId);
		tiers[resourceId] = createInitialTierState(
			registry.getTierTrack(resourceId),
		);
		recentDeltas[resourceId] = 0;

		const parentRecord = registry.getGroupParentForResource(resourceId);
		childToParent[resourceId] = parentRecord?.id;
	}

	for (const parentId of parentIds) {
		const groupIds = registry.getGroupIdsForParent(parentId);
		const childIds: string[] = [];
		for (const groupId of groupIds) {
			const group = registry.getGroup(groupId);
			for (const childId of group.children) {
				childIds.push(childId);
				if (childToParent[childId] === undefined) {
					childToParent[childId] = parentId;
				}
			}
		}

		const frozenChildren = Object.freeze([...childIds]);
		parentChildren[parentId] = frozenChildren;
		bounds[parentId] = registry.getBounds(parentId);
		tiers[parentId] = createInitialTierState(registry.getTierTrack(parentId));

		defineNumericAggregate(amounts, parentId, () =>
			frozenChildren.reduce((sum, childId) => sum + (amounts[childId] ?? 0), 0),
		);
		defineBooleanAggregate(touched, parentId, () =>
			frozenChildren.some((childId) => Boolean(touched[childId])),
		);
	}

	return {
		resourceIds,
		parentIds,
		amounts,
		touched,
		bounds,
		tiers,
		parentChildren,
		childToParent,
		recentDeltas,
	};
}

export function resetRecentResourceV2Gains(
	state: PlayerResourceV2State,
): ResourceV2RecentGainEntry[] {
	const entries: ResourceV2RecentGainEntry[] = [];
	for (const resourceId of state.resourceIds) {
		const delta = state.recentDeltas[resourceId] ?? 0;
		if (delta === 0) {
			continue;
		}
		entries.push({ resourceId, delta });
		state.recentDeltas[resourceId] = 0;
	}
	return entries;
}

function defineNumericAggregate(
	record: Record<string, number>,
	id: string,
	getter: () => number,
) {
	Object.defineProperty(record, id, {
		get: getter,
		set: () => {
			throw new Error(
				`ResourceV2 parent "${id}" amount is derived from child resources.`,
			);
		},
		enumerable: true,
		configurable: true,
	});
}

function defineBooleanAggregate(
	record: Record<string, boolean>,
	id: string,
	getter: () => boolean,
) {
	Object.defineProperty(record, id, {
		get: getter,
		set: () => {
			throw new Error(
				`ResourceV2 parent "${id}" touched state is derived from child resources.`,
			);
		},
		enumerable: true,
		configurable: true,
	});
}

function createInitialTierState(
	track: ResourceV2TierTrackDefinition | undefined,
): PlayerResourceV2TierState | undefined {
	if (!track) {
		return undefined;
	}

	const state: PlayerResourceV2TierState = { trackId: track.id };
	const amount = 0;
	const tier = findTierForAmount(track, amount);
	if (!tier) {
		const first = track.tiers[0];
		if (first) {
			state.nextTierId = first.id;
		}
		return state;
	}

	state.tierId = tier.id;
	const index = track.tiers.findIndex((entry) => entry.id === tier.id);
	const previous = index > 0 ? track.tiers[index - 1] : undefined;
	const next = index >= 0 ? track.tiers[index + 1] : undefined;

	if (previous) {
		state.previousTierId = previous.id;
	}
	if (next) {
		state.nextTierId = next.id;
	}
	return state;
}

function findTierForAmount(
	track: ResourceV2TierTrackDefinition,
	amount: number,
): ResourceV2TierDefinition | undefined {
	for (const tier of track.tiers) {
		const minimum = tier.range.min;
		const maximum = tier.range.max ?? Number.POSITIVE_INFINITY;
		if (amount < minimum) {
			continue;
		}
		if (amount >= maximum) {
			continue;
		}
		return tier;
	}

	if (track.tiers.length === 0) {
		return undefined;
	}

	const lastTier = track.tiers[track.tiers.length - 1]!;
	if (amount >= lastTier.range.min) {
		return lastTier;
	}

	return undefined;
}
