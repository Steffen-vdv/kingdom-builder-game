import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
	SessionPlayerId,
} from '@kingdom-builder/protocol/session';
import { createMetadataKey } from './actionMetadataKey';
import { cloneValue } from './cloneValue';
import type { SessionActionMetadataSnapshot } from './sessionTypes';

interface CachedMetadataEntry<T> {
	value: T;
	stale: boolean;
}

export class ActionMetadataCache {
	#actionCostCache: Map<string, CachedMetadataEntry<SessionActionCostMap>>;
	#actionRequirementCache: Map<
		string,
		CachedMetadataEntry<SessionActionRequirementList>
	>;
	#actionOptionCache: Map<string, CachedMetadataEntry<ActionEffectGroup[]>>;

	constructor() {
		this.#actionCostCache = new Map();
		this.#actionRequirementCache = new Map();
		this.#actionOptionCache = new Map();
	}

	cacheActionCosts(
		actionId: string,
		costs: SessionActionCostMap,
		params?: ActionParametersPayload,
		playerId?: SessionPlayerId,
	): string {
		const key = createMetadataKey(actionId, params, playerId);
		this.#actionCostCache.set(key, {
			value: cloneValue(costs),
			stale: false,
		});
		return key;
	}

	cacheActionRequirements(
		actionId: string,
		requirements: SessionActionRequirementList,
		params?: ActionParametersPayload,
		playerId?: SessionPlayerId,
	): string {
		const key = createMetadataKey(actionId, params, playerId);
		this.#actionRequirementCache.set(key, {
			value: cloneValue(requirements),
			stale: false,
		});
		return key;
	}

	cacheActionOptions(actionId: string, groups: ActionEffectGroup[]): string {
		const key = createMetadataKey(actionId, undefined, undefined);
		this.#actionOptionCache.set(key, {
			value: cloneValue(groups),
			stale: false,
		});
		return key;
	}

	invalidateAll(): string[] {
		const keys = new Set<string>();
		for (const [key, entry] of this.#actionCostCache.entries()) {
			entry.stale = true;
			keys.add(key);
		}
		for (const [key, entry] of this.#actionRequirementCache.entries()) {
			entry.stale = true;
			keys.add(key);
		}
		for (const [key, entry] of this.#actionOptionCache.entries()) {
			entry.stale = true;
			keys.add(key);
		}
		return [...keys];
	}

	getActionCosts(
		actionId: string,
		params?: ActionParametersPayload,
		playerId?: SessionPlayerId,
	): SessionActionCostMap {
		const key = createMetadataKey(actionId, params, playerId);
		const cached = this.#actionCostCache.get(key);
		return cached ? cloneValue(cached.value) : {};
	}

	getActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
		playerId?: SessionPlayerId,
	): SessionActionRequirementList {
		const key = createMetadataKey(actionId, params, playerId);
		const cached = this.#actionRequirementCache.get(key);
		return cached ? cloneValue(cached.value) : [];
	}

	getActionOptions(actionId: string): ActionEffectGroup[] {
		const key = createMetadataKey(actionId, undefined, undefined);
		const cached = this.#actionOptionCache.get(key);
		return cached ? cloneValue(cached.value) : [];
	}

	readActionMetadata(
		actionId: string,
		params?: ActionParametersPayload,
		playerId?: SessionPlayerId,
	): SessionActionMetadataSnapshot {
		const snapshot: SessionActionMetadataSnapshot = {};
		const key = createMetadataKey(actionId, params, playerId);
		const cachedCosts = this.#actionCostCache.get(key);
		if (cachedCosts) {
			snapshot.costs = cloneValue(cachedCosts.value);
			if (cachedCosts.stale) {
				snapshot.stale ??= {};
				snapshot.stale.costs = true;
			}
		}
		const cachedRequirements = this.#actionRequirementCache.get(key);
		if (cachedRequirements) {
			snapshot.requirements = cloneValue(cachedRequirements.value);
			if (cachedRequirements.stale) {
				snapshot.stale ??= {};
				snapshot.stale.requirements = true;
			}
		}
		const optionKey = createMetadataKey(actionId, undefined, undefined);
		const cachedGroups = this.#actionOptionCache.get(optionKey);
		if (cachedGroups) {
			snapshot.groups = cloneValue(cachedGroups.value);
			if (cachedGroups.stale) {
				snapshot.stale ??= {};
				snapshot.stale.groups = true;
			}
		}
		return snapshot;
	}
}
