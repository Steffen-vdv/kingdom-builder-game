/**
 * Cascading reconciliation for dynamic resource bounds.
 * When a resource that acts as another resource's bound changes, dependent
 * resources are automatically reconciled according to their configured mode.
 */
import type { EngineContext } from '../context';
import type { PlayerState } from '../state';
import type { RuntimeResourceCatalog } from './types';
import {
	getCatalogIndexes,
	isBoundReference,
	resolveBoundValue,
	resolveResourceDefinition,
	type BoundDependentEntry,
	type ResourceDefinitionLike,
} from './state-helpers';
import { ResourceBoundExceededError } from './reconciliation';

type ApplyValueFn = (
	ctx: EngineContext | null | undefined,
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	lookup: ResourceDefinitionLike,
	resourceId: string,
	value: number,
	options: { suppressRecentEntry: boolean },
	reconciling: Set<string>,
) => number;

/** Reconcile dependents when a bound resource changes. */
export function reconcileBoundDependents(
	context: EngineContext | null | undefined,
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	resourceId: string,
	reconciling: Set<string>,
	applyValue: ApplyValueFn,
): void {
	const indexes = getCatalogIndexes(catalog);
	const dependents = indexes.boundDependents[resourceId];
	if (!dependents || dependents.length === 0) {
		return;
	}
	for (const entry of dependents) {
		reconcileDependent(
			context,
			player,
			catalog,
			entry,
			reconciling,
			applyValue,
		);
	}
}

function reconcileDependent(
	context: EngineContext | null | undefined,
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	entry: BoundDependentEntry,
	reconciling: Set<string>,
	applyValue: ApplyValueFn,
): void {
	const { dependentId, direction, reconciliation } = entry;
	if (reconciling.has(dependentId) || reconciliation === 'pass') {
		return;
	}
	const lookup = resolveResourceDefinition(catalog, dependentId);
	if (!lookup) {
		return;
	}
	const currentValue = player.resourceValues[dependentId] ?? 0;
	const defBound =
		direction === 'lower'
			? lookup.definition.lowerBound
			: lookup.definition.upperBound;
	const playerBound =
		direction === 'lower'
			? player.resourceLowerBounds[dependentId]
			: player.resourceUpperBounds[dependentId];
	const boundRef = isBoundReference(defBound)
		? defBound
		: (playerBound ?? defBound);
	const resolvedBound = resolveBoundValue(boundRef, player.resourceValues);
	const violates =
		direction === 'lower'
			? resolvedBound !== null && currentValue < resolvedBound
			: resolvedBound !== null && currentValue > resolvedBound;
	if (!violates) {
		return;
	}
	const targetBound = resolvedBound as number;
	if (reconciliation === 'reject') {
		throw new ResourceBoundExceededError(
			direction,
			currentValue,
			targetBound,
			0,
		);
	}
	reconciling.add(dependentId);
	try {
		applyValue(
			context,
			player,
			catalog,
			lookup,
			dependentId,
			targetBound,
			{ suppressRecentEntry: false },
			reconciling,
		);
	} finally {
		reconciling.delete(dependentId);
	}
}
