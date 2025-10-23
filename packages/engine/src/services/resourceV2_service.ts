import type { EngineContext } from '../context';
import type { PlayerState, ResourceV2Key } from '../state';
import { getResourceV2Definition } from '../state';
import {
	ResourceV2Reconciliation,
	ResourceV2Rounding,
	type ResourceV2RuntimeDefinition,
	type ResourceV2RuntimeGroupParent,
} from '../resourcesV2';
import type {
	ResourceV2BoundAdjustment,
	ResourceV2Transfer,
	ResourceV2ValueDelta,
} from '@kingdom-builder/protocol';
import { ResourceV2CatalogCache } from './resourceV2_catalog';
import {
	getBoundOrFallback,
	reconcileBound,
	reconcileValue,
	roundValue,
} from './resourceV2_math';

type RuntimeDefinition =
	| ResourceV2RuntimeDefinition
	| ResourceV2RuntimeGroupParent;

type ResourceChangeHandler = (
	context: EngineContext,
	player: PlayerState,
	resourceId: ResourceV2Key,
	definition?: RuntimeDefinition,
) => void;

const DEFAULT_RECONCILIATION = ResourceV2Reconciliation.Clamp;
const DEFAULT_ROUNDING = ResourceV2Rounding.Nearest;

export class ResourceV2Service {
	private readonly onResourceChange: ResourceChangeHandler;
	private readonly catalogCache = new ResourceV2CatalogCache();

	constructor(onResourceChange: ResourceChangeHandler) {
		this.onResourceChange = onResourceChange;
	}

	applyDelta(
		context: EngineContext,
		player: PlayerState,
		delta: ResourceV2ValueDelta,
	): number {
		const catalog = this.catalogCache.ensure();
		const definition =
			getResourceV2Definition(delta.resourceId) ??
			catalog?.parentsById[delta.resourceId];
		const previous = player.getResourceV2Value(delta.resourceId);
		const amount =
			delta.amount !== undefined
				? delta.amount
				: roundValue(
						(previous * (delta.percent ?? 0)) / 100,
						delta.rounding ?? DEFAULT_ROUNDING,
					);
		const reconciliation = delta.reconciliation ?? DEFAULT_RECONCILIATION;
		const next = reconcileValue(
			player,
			delta.resourceId,
			previous + amount,
			definition?.lowerBound,
			definition?.upperBound,
			reconciliation,
		);
		const actualDelta = next - previous;
		if (actualDelta !== 0) {
			player.setResourceV2Value(delta.resourceId, next);
			player.logResourceV2Gain(delta.resourceId, actualDelta);
			this.updateParentValue(
				context,
				player,
				delta.resourceId,
				delta.suppressHooks ?? false,
			);
			if (!delta.suppressHooks) {
				this.onResourceChange(context, player, delta.resourceId, definition);
			}
		}
		return actualDelta;
	}

	applyTransfer(
		context: EngineContext,
		player: PlayerState,
		transfer: ResourceV2Transfer,
	): { amountMoved: number } {
		const rounding = transfer.rounding ?? DEFAULT_ROUNDING;
		const donorCurrent = player.getResourceV2Value(transfer.from.resourceId);
		const requested =
			transfer.amount !== undefined
				? transfer.amount
				: roundValue((donorCurrent * (transfer.percent ?? 0)) / 100, rounding);
		if (requested === 0) {
			return { amountMoved: 0 };
		}

		const fromReconciliation =
			transfer.from.reconciliation ?? DEFAULT_RECONCILIATION;
		const donorChange = this.applyDelta(context, player, {
			resourceId: transfer.from.resourceId,
			amount: -Math.abs(requested),
			reconciliation: fromReconciliation,
			suppressHooks: transfer.suppressHooks,
		});
		const removed = -donorChange;
		if (removed === 0) {
			return { amountMoved: 0 };
		}

		const toReconciliation =
			transfer.to.reconciliation ?? DEFAULT_RECONCILIATION;
		this.applyDelta(context, player, {
			resourceId: transfer.to.resourceId,
			amount: removed,
			reconciliation: toReconciliation,
			suppressHooks: transfer.suppressHooks,
		});

		return { amountMoved: removed };
	}

	adjustBound(
		context: EngineContext,
		player: PlayerState,
		adjustment: ResourceV2BoundAdjustment,
	): void {
		const catalog = this.catalogCache.ensure();
		const definition =
			getResourceV2Definition(adjustment.resourceId) ??
			catalog?.parentsById[adjustment.resourceId];
		const lowerFallback = definition?.lowerBound;
		const upperFallback = definition?.upperBound;
		const currentLower = player.getResourceV2LowerBound(adjustment.resourceId);
		const currentUpper = player.getResourceV2UpperBound(adjustment.resourceId);
		if (adjustment.target === 'lower') {
			const nextLower = getBoundOrFallback(
				currentLower,
				lowerFallback,
				Number.NEGATIVE_INFINITY,
			);
			const reconciled = reconcileBound(
				nextLower + adjustment.amount,
				lowerFallback,
				upperFallback,
				adjustment.reconciliation ?? DEFAULT_RECONCILIATION,
				'lower',
			);
			player.setResourceV2LowerBound(adjustment.resourceId, reconciled);
		} else {
			const nextUpper = getBoundOrFallback(
				currentUpper,
				upperFallback,
				Number.POSITIVE_INFINITY,
			);
			const reconciled = reconcileBound(
				nextUpper + adjustment.amount,
				lowerFallback,
				upperFallback,
				adjustment.reconciliation ?? DEFAULT_RECONCILIATION,
				'upper',
			);
			player.setResourceV2UpperBound(adjustment.resourceId, reconciled);
		}
		this.enforceBounds(context, player, adjustment.resourceId, definition);
	}

	private enforceBounds(
		context: EngineContext,
		player: PlayerState,
		resourceId: ResourceV2Key,
		definition: RuntimeDefinition | undefined,
	) {
		const reconciliation = ResourceV2Reconciliation.Clamp;
		const previous = player.getResourceV2Value(resourceId);
		const next = reconcileValue(
			player,
			resourceId,
			previous,
			definition?.lowerBound,
			definition?.upperBound,
			reconciliation,
		);
		if (next !== previous) {
			player.setResourceV2Value(resourceId, next);
			player.logResourceV2Gain(resourceId, next - previous);
			this.updateParentValue(context, player, resourceId, false);
			this.onResourceChange(context, player, resourceId, definition);
		}
	}

	private updateParentValue(
		context: EngineContext,
		player: PlayerState,
		resourceId: ResourceV2Key,
		suppressHooks: boolean,
	) {
		const catalog = this.catalogCache.ensure();
		const definition = getResourceV2Definition(resourceId);
		const parentId = definition?.parentId;
		if (!parentId || !catalog) {
			return;
		}
		const children = this.catalogCache.childrenOf(parentId);
		const total = children.reduce(
			(sum, child) => sum + player.getResourceV2Value(child),
			0,
		);
		const previous = player.getResourceV2Value(parentId);
		if (previous === total) {
			return;
		}
		const parentDefinition = this.catalogCache.parentDefinition(parentId);
		this.ensureParentInitialization(player, parentId, parentDefinition);
		player.setResourceV2Value(parentId, total);
		player.logResourceV2Gain(parentId, total - previous);
		if (!suppressHooks) {
			this.onResourceChange(context, player, parentId, parentDefinition);
		}
		this.updateParentValue(context, player, parentId, suppressHooks);
	}

	private ensureParentInitialization(
		player: PlayerState,
		parentId: ResourceV2Key,
		parentDefinition: ResourceV2RuntimeGroupParent | undefined,
	) {
		if (player.resourceV2.values[parentId] === undefined) {
			player.setResourceV2Value(parentId, 0);
		}
		if (parentDefinition) {
			if (player.resourceV2.lowerBounds[parentId] === undefined) {
				player.setResourceV2LowerBound(parentId, parentDefinition.lowerBound);
			}
			if (player.resourceV2.upperBounds[parentId] === undefined) {
				player.setResourceV2UpperBound(parentId, parentDefinition.upperBound);
			}
		}
	}
}
