import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '@kingdom-builder/protocol/session';
import { createMetadataKey } from './actionMetadataKey';
import { cloneValue } from './cloneValue';
import type { SessionActionMetadataSnapshot } from './sessionTypes';

export class ActionMetadataCache {
	#actionCostCache: Map<string, SessionActionCostMap>;
	#actionRequirementCache: Map<string, SessionActionRequirementList>;
	#actionOptionCache: Map<string, ActionEffectGroup[]>;

	constructor() {
		this.#actionCostCache = new Map();
		this.#actionRequirementCache = new Map();
		this.#actionOptionCache = new Map();
	}

	clear(): string[] {
		const keys = new Set<string>();
		for (const key of this.#actionCostCache.keys()) {
			keys.add(key);
		}
		for (const key of this.#actionRequirementCache.keys()) {
			keys.add(key);
		}
		for (const key of this.#actionOptionCache.keys()) {
			keys.add(key);
		}
		this.#actionCostCache.clear();
		this.#actionRequirementCache.clear();
		this.#actionOptionCache.clear();
		return [...keys];
	}

	cacheActionCosts(
		actionId: string,
		costs: SessionActionCostMap,
		params?: ActionParametersPayload,
	): string {
		const key = createMetadataKey(actionId, params);
		this.#actionCostCache.set(key, cloneValue(costs));
		return key;
	}

	cacheActionRequirements(
		actionId: string,
		requirements: SessionActionRequirementList,
		params?: ActionParametersPayload,
	): string {
		const key = createMetadataKey(actionId, params);
		this.#actionRequirementCache.set(key, cloneValue(requirements));
		return key;
	}

	cacheActionOptions(actionId: string, groups: ActionEffectGroup[]): string {
		const key = createMetadataKey(actionId, undefined);
		this.#actionOptionCache.set(key, cloneValue(groups));
		return key;
	}

	getActionCosts(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionCostMap {
		const key = createMetadataKey(actionId, params);
		const cached = this.#actionCostCache.get(key);
		return cached ? cloneValue(cached) : {};
	}

	getActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionRequirementList {
		const key = createMetadataKey(actionId, params);
		const cached = this.#actionRequirementCache.get(key);
		return cached ? cloneValue(cached) : [];
	}

	getActionOptions(actionId: string): ActionEffectGroup[] {
		const key = createMetadataKey(actionId, undefined);
		const cached = this.#actionOptionCache.get(key);
		return cached ? cloneValue(cached) : [];
	}

	readActionMetadata(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionMetadataSnapshot {
		const snapshot: SessionActionMetadataSnapshot = {};
		const key = createMetadataKey(actionId, params);
		const cachedCosts = this.#actionCostCache.get(key);
		if (cachedCosts) {
			snapshot.costs = cloneValue(cachedCosts);
		}
		const cachedRequirements = this.#actionRequirementCache.get(key);
		if (cachedRequirements) {
			snapshot.requirements = cloneValue(cachedRequirements);
		}
		const optionKey = createMetadataKey(actionId, undefined);
		const cachedGroups = this.#actionOptionCache.get(optionKey);
		if (cachedGroups) {
			snapshot.groups = cloneValue(cachedGroups);
		}
		return snapshot;
	}
}
