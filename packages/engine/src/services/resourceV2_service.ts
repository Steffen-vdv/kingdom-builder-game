import type { EngineContext } from '../context';
import type { PlayerState, ResourceV2Key } from '../state';
import type {
	ResourceV2BoundAdjustment,
	ResourceV2Transfer,
	ResourceV2ValueDelta,
} from '@kingdom-builder/protocol';
import {
	ResourceV2Reconciliation,
	type ResourceV2RuntimeCatalog,
	type ResourceV2RuntimeDefinition,
} from '../resourcesV2';
import { ResourceV2ParentTracker } from './resourceV2_parent_tracker';
import {
	clampValue,
	normalizeReconciliation,
	resolveRounding,
	roundValue,
} from './resourceV2_math';
import type {
	ResourceV2Change,
	ResourceV2ChangeHandler,
	ResourceV2Hook,
} from './resourceV2_types';
export type {
	ResourceV2Change,
	ResourceV2ChangeHandler,
	ResourceV2Hook,
} from './resourceV2_types';

export class ResourceV2Service {
	private definitions: Record<ResourceV2Key, ResourceV2RuntimeDefinition> = {};
	private parentTracker: ResourceV2ParentTracker;
	private gainHooks = new Set<ResourceV2Hook>();
	private lossHooks = new Set<ResourceV2Hook>();

	constructor(
		catalog: ResourceV2RuntimeCatalog | undefined,
		private readonly onChange?: ResourceV2ChangeHandler,
		parentTracker?: ResourceV2ParentTracker,
	) {
		this.parentTracker = parentTracker ?? new ResourceV2ParentTracker(catalog);
		if (!catalog) {
			return;
		}
		for (const [id, definition] of Object.entries(catalog.resourcesById)) {
			if (!definition) {
				continue;
			}
			this.definitions[id] = definition;
		}
	}

	clone(
		onChange: ResourceV2ChangeHandler | undefined = this.onChange,
	): ResourceV2Service {
		const copy = new ResourceV2Service(
			undefined,
			onChange,
			this.parentTracker.clone(),
		);
		copy.definitions = { ...this.definitions };
		copy.gainHooks = new Set(this.gainHooks);
		copy.lossHooks = new Set(this.lossHooks);
		return copy;
	}

	hasDefinition(resourceId: ResourceV2Key): boolean {
		return Boolean(
			this.definitions[resourceId] || this.parentTracker.has(resourceId),
		);
	}

	onGain(hook: ResourceV2Hook): () => void {
		this.gainHooks.add(hook);
		return () => {
			this.gainHooks.delete(hook);
		};
	}

	onLoss(hook: ResourceV2Hook): () => void {
		this.lossHooks.add(hook);
		return () => {
			this.lossHooks.delete(hook);
		};
	}

	getValue(player: PlayerState, resourceId: ResourceV2Key): number {
		if (this.definitions[resourceId]) {
			return player.getResourceV2Value(resourceId);
		}
		return this.parentTracker.getValue(player, resourceId);
	}

	addValue(
		context: EngineContext,
		player: PlayerState,
		delta: ResourceV2ValueDelta,
		multiplier = 1,
	): number {
		const amount = this.resolveDelta(player, delta, multiplier);
		return this.applyDelta(context, player, delta.resourceId, amount, {
			reconciliation: delta.reconciliation,
			suppressHooks: Boolean(delta.suppressHooks),
		});
	}

	removeValue(
		context: EngineContext,
		player: PlayerState,
		delta: ResourceV2ValueDelta,
		multiplier = 1,
	): number {
		const amount = this.resolveDelta(player, delta, multiplier);
		const removal = amount >= 0 ? -amount : amount;
		return this.applyDelta(context, player, delta.resourceId, removal, {
			reconciliation: delta.reconciliation,
			suppressHooks: Boolean(delta.suppressHooks),
		});
	}

	transferValue(
		context: EngineContext,
		donor: PlayerState,
		recipient: PlayerState,
		transfer: ResourceV2Transfer,
		multiplier = 1,
	): number {
		const { from, to, suppressHooks } = transfer;
		const hookSuppressed = Boolean(suppressHooks);
		const planned = this.resolveTransferAmount(donor, transfer, multiplier);
		if (planned <= 0) {
			return 0;
		}
		const removed = this.applyDelta(context, donor, from.resourceId, -planned, {
			reconciliation: from.reconciliation,
			suppressHooks: hookSuppressed,
		});
		const donated = Math.abs(removed);
		if (donated <= 0) {
			return 0;
		}
		const received = this.applyDelta(
			context,
			recipient,
			to.resourceId,
			donated,
			{
				reconciliation: to.reconciliation,
				suppressHooks: hookSuppressed,
			},
		);
		if (received < donated) {
			this.applyDelta(context, donor, from.resourceId, donated - received, {
				reconciliation: from.reconciliation,
				suppressHooks: hookSuppressed,
			});
		}
		return received;
	}

	adjustBound(
		context: EngineContext,
		player: PlayerState,
		adjustment: ResourceV2BoundAdjustment,
		multiplier = 1,
	): ResourceV2Change {
		const { resourceId, target } = adjustment;
		if (!this.definitions[resourceId]) {
			throw new Error(
				`ResourceV2 bound adjustment requires a mutable resource: ${resourceId}`,
			);
		}
		const amount = adjustment.amount * multiplier;
		const previousLower = player.getResourceV2LowerBound(resourceId);
		const previousUpper = player.getResourceV2UpperBound(resourceId);
		let nextLower = previousLower;
		let nextUpper = previousUpper;
		if (target === 'lower') {
			nextLower = (previousLower ?? 0) + amount;
			player.setResourceV2LowerBound(resourceId, nextLower);
		} else {
			nextUpper = (previousUpper ?? 0) + amount;
			player.setResourceV2UpperBound(resourceId, nextUpper);
		}
		const reconciled = clampValue(
			player.getResourceV2Value(resourceId),
			player.getResourceV2LowerBound(resourceId),
			player.getResourceV2UpperBound(resourceId),
		);
		const previousValue = player.getResourceV2Value(resourceId);
		let delta = 0;
		if (reconciled !== previousValue) {
			delta = this.applyDelta(
				context,
				player,
				resourceId,
				reconciled - previousValue,
				{ reconciliation: adjustment.reconciliation },
			);
		}
		const previousBound = target === 'lower' ? previousLower : previousUpper;
		const nextBound = target === 'lower' ? nextLower : nextUpper;
		const change: ResourceV2Change = {
			reason: target === 'lower' ? 'lowerBound' : 'upperBound',
			previousValue,
			newValue: previousValue + delta,
			delta,
			suppressHooks: false,
		};
		if (previousBound !== undefined) {
			change.previousBound = previousBound;
		}
		if (nextBound !== undefined) {
			change.newBound = nextBound;
		}
		this.onChange?.(context, player, resourceId, change);
		return change;
	}

	private resolveDelta(
		player: PlayerState,
		delta: ResourceV2ValueDelta,
		multiplier: number,
	): number {
		if (!this.definitions[delta.resourceId]) {
			throw new Error(
				`ResourceV2 value change requires a mutable resource: ${delta.resourceId}`,
			);
		}
		if (delta.amount !== undefined) {
			return delta.amount * multiplier;
		}
		if (delta.percent === undefined) {
			throw new Error(
				`ResourceV2 delta for "${delta.resourceId}" requires amount or percent.`,
			);
		}
		const base = this.getValue(player, delta.resourceId);
		return roundValue(
			(base * delta.percent * multiplier) / 100,
			resolveRounding(delta.rounding),
		);
	}

	private resolveTransferAmount(
		donor: PlayerState,
		transfer: ResourceV2Transfer,
		multiplier: number,
	): number {
		if (transfer.amount !== undefined) {
			return Math.max(0, transfer.amount * multiplier);
		}
		const percent = transfer.percent ?? 0;
		const value = this.getValue(donor, transfer.from.resourceId);
		return Math.max(
			0,
			roundValue(
				(value * percent * multiplier) / 100,
				resolveRounding(transfer.rounding),
			),
		);
	}

	private applyDelta(
		context: EngineContext,
		player: PlayerState,
		resourceId: ResourceV2Key,
		delta: number,
		options: {
			reconciliation?: ResourceV2ValueDelta['reconciliation'];
			suppressHooks?: boolean;
		},
	): number {
		if (delta === 0) {
			return 0;
		}
		const definition = this.definitions[resourceId];
		if (!definition) {
			throw new Error(
				`Cannot mutate ResourceV2 parent "${resourceId}" directly.`,
			);
		}
		const reconciler = normalizeReconciliation(options.reconciliation);
		const lower = player.getResourceV2LowerBound(resourceId);
		const upper = player.getResourceV2UpperBound(resourceId);
		const current = player.getResourceV2Value(resourceId);
		const target = current + delta;
		const next =
			reconciler === ResourceV2Reconciliation.Clamp
				? clampValue(target, lower, upper)
				: target;
		const applied = next - current;
		if (applied === 0) {
			return 0;
		}
		player.setResourceV2Value(resourceId, next);
		player.logResourceV2Gain(
			resourceId,
			applied,
			Boolean(options.suppressHooks),
		);
		if (!options.suppressHooks) {
			this.emitHook(applied, context, player, resourceId);
		}
		this.onChange?.(context, player, resourceId, {
			reason: 'value',
			previousValue: current,
			newValue: next,
			delta: applied,
			suppressHooks: Boolean(options.suppressHooks),
		});
		this.parentTracker.handleChange({
			player,
			childId: resourceId,
			suppressHooks: Boolean(options.suppressHooks),
			emitHook: (parentDelta, parentId) => {
				this.emitHook(parentDelta, context, player, parentId);
			},
			onChange: (parentId, previous, nextValue, suppressHooks) => {
				this.onChange?.(context, player, parentId, {
					reason: 'value',
					previousValue: previous,
					newValue: nextValue,
					delta: nextValue - previous,
					suppressHooks,
				});
			},
		});
		return applied;
	}

	private emitHook(
		delta: number,
		context: EngineContext,
		player: PlayerState,
		resourceId: ResourceV2Key,
	): void {
		const hooks = delta > 0 ? this.gainHooks : this.lossHooks;
		const amount = Math.abs(delta);
		for (const hook of hooks) {
			hook(context, { player, resourceId, amount });
		}
	}
}
