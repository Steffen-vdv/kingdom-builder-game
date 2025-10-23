import type { ResourceV2BoundsMetadata } from '@kingdom-builder/protocol';

import type { EngineContext } from '../context';
import type { PlayerState, ResourceV2ValueChangeRequest } from '../state';
import { applyResourceV2ValueChange } from '../state';
import type { ResourceV2EngineRegistry } from './registry';
import type { ResourceV2TierService } from './tier_service';

export interface ResourceV2HookPayload {
	readonly resourceId: string;
	readonly amount: number;
	readonly player: PlayerState;
	readonly context: EngineContext;
}

export type ResourceV2Hook = (payload: ResourceV2HookPayload) => void;

export class ResourceV2Service {
	private registry: ResourceV2EngineRegistry | undefined;
	private readonly onGainHooks = new Set<ResourceV2Hook>();
	private readonly onLossHooks = new Set<ResourceV2Hook>();
	private tierService: ResourceV2TierService | undefined;

	constructor(
		registry?: ResourceV2EngineRegistry,
		tierService?: ResourceV2TierService,
	) {
		this.registry = registry;
		if (tierService) {
			this.setTierService(tierService);
		}
	}

	setRegistry(registry: ResourceV2EngineRegistry) {
		this.registry = registry;
		this.tierService?.setRegistry(registry);
	}

	getRegistry(): ResourceV2EngineRegistry | undefined {
		return this.registry;
	}

	setTierService(tierService: ResourceV2TierService) {
		this.tierService = tierService;
		if (this.registry) {
			tierService.setRegistry(this.registry);
		}
	}

	registerOnGain(hook: ResourceV2Hook): () => void {
		this.onGainHooks.add(hook);
		return () => {
			this.onGainHooks.delete(hook);
		};
	}

	registerOnLoss(hook: ResourceV2Hook): () => void {
		this.onLossHooks.add(hook);
		return () => {
			this.onLossHooks.delete(hook);
		};
	}

	applyValueChange(
		context: EngineContext,
		player: PlayerState,
		resourceId: string,
		change: ResourceV2ValueChangeRequest,
	): number {
		const state = player.resourceV2;
		const applied = applyResourceV2ValueChange(state, resourceId, change);
		if (applied === 0) {
			return 0;
		}

		if (player === context.activePlayer) {
			context.recentResourceGains.push({
				key: resourceId,
				amount: applied,
			});
		}

		if (!change.suppressHooks) {
			const payload: ResourceV2HookPayload = {
				resourceId,
				amount: Math.abs(applied),
				player,
				context,
			};
			if (applied > 0) {
				this.emitHooks(this.onGainHooks, payload);
			} else {
				this.emitHooks(this.onLossHooks, payload);
			}
		}

		this.tierService?.handleValueChange(context, player, resourceId);

		return applied;
	}

	increaseUpperBound(
		_context: EngineContext,
		player: PlayerState,
		resourceId: string,
		increase: number,
	): void {
		if (increase === 0) {
			return;
		}

		const state = player.resourceV2;
		const current = state.bounds[resourceId];
		const next = this.createUpdatedBounds(current, increase);
		state.bounds[resourceId] = next;

		this.markBoundHistory(state, resourceId);
	}

	clone(tierService?: ResourceV2TierService): ResourceV2Service {
		const clone = new ResourceV2Service(this.registry, tierService);
		for (const hook of this.onGainHooks) {
			clone.onGainHooks.add(hook);
		}
		for (const hook of this.onLossHooks) {
			clone.onLossHooks.add(hook);
		}
		return clone;
	}

	private emitHooks(
		hooks: Set<ResourceV2Hook>,
		payload: ResourceV2HookPayload,
	) {
		for (const hook of hooks) {
			hook(payload);
		}
	}

	private createUpdatedBounds(
		current: ResourceV2BoundsMetadata | undefined,
		increase: number,
	): ResourceV2BoundsMetadata {
		const upper = current?.upperBound ?? 0;
		const nextUpper = upper + increase;
		const lowerBound = current?.lowerBound;
		return lowerBound !== undefined
			? { lowerBound, upperBound: nextUpper }
			: { upperBound: nextUpper };
	}

	private markBoundHistory(
		state: PlayerState['resourceV2'],
		resourceId: string,
	) {
		if (!this.shouldTrackBoundHistory(resourceId)) {
			return;
		}

		state.boundHistory[resourceId] = true;
		const parentId = state.childToParent[resourceId];
		if (!parentId) {
			return;
		}

		this.markBoundHistory(state, parentId);
	}

	private shouldTrackBoundHistory(resourceId: string): boolean {
		const record = this.registry?.findEntity(resourceId);
		return Boolean(record?.trackBoundBreakdown);
	}
}
