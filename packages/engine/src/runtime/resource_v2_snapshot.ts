import type {
	ResourceV2RecentGainEntry,
	SessionResourceTierStateSnapshot,
	SessionResourceValueParentSnapshot,
	SessionResourceValueSnapshot,
	SessionResourceValueSnapshotMap,
} from '@kingdom-builder/protocol';
import type { PlayerState } from '../state';

function cloneTierState(
	tierState: PlayerState['resourceV2']['tiers'][string] | undefined,
): SessionResourceTierStateSnapshot | undefined {
	if (!tierState) {
		return undefined;
	}

	const snapshot: SessionResourceTierStateSnapshot = {
		trackId: tierState.trackId,
	};

	if (tierState.tierId !== undefined) {
		snapshot.tierId = tierState.tierId;
	}
	if (tierState.nextTierId !== undefined) {
		snapshot.nextTierId = tierState.nextTierId;
	}
	if (tierState.previousTierId !== undefined) {
		snapshot.previousTierId = tierState.previousTierId;
	}

	return snapshot;
}

function cloneParentSnapshot(
	state: PlayerState['resourceV2'],
	parentId: string,
): SessionResourceValueParentSnapshot | undefined {
	const amount = state.amounts[parentId];
	if (amount === undefined) {
		return undefined;
	}

	const snapshot: SessionResourceValueParentSnapshot = {
		id: parentId,
		amount,
		touched: Boolean(state.touched[parentId]),
	};

	const bounds = state.bounds[parentId];
	if (bounds) {
		snapshot.bounds = { ...bounds };
	}

	return snapshot;
}

function createRecentResourceGains(
	state: PlayerState['resourceV2'],
	resourceId: string,
): ReadonlyArray<ResourceV2RecentGainEntry> {
	const delta = state.recentDeltas[resourceId] ?? 0;
	if (delta === 0) {
		return [];
	}
	return [{ resourceId, delta }];
}

function cloneValueSnapshot(
	state: PlayerState['resourceV2'],
	resourceId: string,
): SessionResourceValueSnapshot {
	const snapshot: SessionResourceValueSnapshot = {
		amount: state.amounts[resourceId] ?? 0,
		touched: Boolean(state.touched[resourceId]),
		recentGains: createRecentResourceGains(state, resourceId),
	};

	const tier = cloneTierState(state.tiers[resourceId]);
	if (tier) {
		snapshot.tier = tier;
	}

	const parentId = state.childToParent[resourceId];
	if (parentId) {
		const parentSnapshot = cloneParentSnapshot(state, parentId);
		if (parentSnapshot) {
			snapshot.parent = parentSnapshot;
		}
	}

	return snapshot;
}

export function createResourceV2ValueSnapshotMap(
	player: PlayerState,
): SessionResourceValueSnapshotMap | undefined {
	const state = player.resourceV2;
	const { resourceIds, parentIds } = state;

	if (resourceIds.length === 0 && parentIds.length === 0) {
		return undefined;
	}

	const values: SessionResourceValueSnapshotMap = {};

	for (const resourceId of resourceIds) {
		values[resourceId] = cloneValueSnapshot(state, resourceId);
	}

	for (const parentId of parentIds) {
		if (Object.prototype.hasOwnProperty.call(values, parentId)) {
			continue;
		}

		const tier = cloneTierState(state.tiers[parentId]);
		const snapshot: SessionResourceValueSnapshot = {
			amount: state.amounts[parentId] ?? 0,
			touched: Boolean(state.touched[parentId]),
			recentGains: [],
		};
		if (tier) {
			snapshot.tier = tier;
		}

		values[parentId] = snapshot;
	}

	return values;
}

export function cloneResourceV2ValueSnapshotMap(
	source: SessionResourceValueSnapshotMap | undefined,
): SessionResourceValueSnapshotMap | undefined {
	if (!source) {
		return undefined;
	}

	const cloned: SessionResourceValueSnapshotMap = {};
	for (const [resourceId, snapshot] of Object.entries(source)) {
		const clonedRecentGains = snapshot.recentGains.map((gain) => ({
			...gain,
		}));
		const entry: SessionResourceValueSnapshot = {
			amount: snapshot.amount,
			touched: snapshot.touched,
			recentGains: clonedRecentGains,
		};
		if (snapshot.tier) {
			entry.tier = { ...snapshot.tier };
		}
		if (snapshot.parent) {
			const parentClone: SessionResourceValueParentSnapshot = {
				id: snapshot.parent.id,
				amount: snapshot.parent.amount,
				touched: snapshot.parent.touched,
			};
			if (snapshot.parent.bounds) {
				parentClone.bounds = {
					...snapshot.parent.bounds,
				};
			}
			entry.parent = parentClone;
		}
		cloned[resourceId] = entry;
	}

	return cloned;
}
