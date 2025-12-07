import type { SessionResourceBoundValue } from '@kingdom-builder/protocol';
import { statDisplaysAsPercent } from '../../utils/resourceSources';
import { findResourcePctBreakdown, type StepEffects } from './statBreakdown';
import type { ActionDiffChange } from './diff';
import {
	formatPercentBreakdown,
	formatResourceSource,
	signedNumber,
	type SignedDelta,
} from './diffFormatting';
import { type PlayerSnapshot } from './snapshots';
import type {
	TranslationAssets,
	TranslationResourceMetadataSelectors,
} from '../context';
import {
	formatResourceSummary,
	type ResourceMetadataSnapshot,
	type ResourceValueSnapshot,
} from '../resource';
export {
	appendBuildingChanges,
	appendLandChanges,
} from './buildingLandChanges';

const EPSILON = 1e-6;

function isMeaningfulDelta(delta: number): boolean {
	return Math.abs(delta) > EPSILON;
}

function resolveResourceValue(
	snapshot: PlayerSnapshot,
	resourceId: string,
): number | undefined {
	// Use values directly - all resources, stats, and population are unified
	const values = snapshot.values;
	if (values && typeof values[resourceId] === 'number') {
		return values[resourceId];
	}
	return undefined;
}

/**
 * Resolves a single bound value to a number, handling both static numbers
 * and dynamic bound references.
 */
function resolveBoundValueToNumber(
	bound: SessionResourceBoundValue | null | undefined,
	values: Record<string, number> | undefined,
): number | null {
	if (bound === null || bound === undefined) {
		return null;
	}
	if (typeof bound === 'number') {
		return bound;
	}
	// It's a bound reference - look up the value from the referenced resource
	if (typeof bound === 'object' && 'resourceId' in bound) {
		const refValue = values?.[bound.resourceId];
		return typeof refValue === 'number' ? refValue : null;
	}
	return null;
}

function resolveBounds(
	snapshot: PlayerSnapshot,
	resourceId: string,
): Pick<ResourceValueSnapshot, 'lowerBound' | 'upperBound'> {
	const bounds = snapshot.resourceBounds[resourceId];
	if (!bounds) {
		return {};
	}
	const lowerBound = resolveBoundValueToNumber(
		bounds.lowerBound,
		snapshot.values,
	);
	const upperBound = resolveBoundValueToNumber(
		bounds.upperBound,
		snapshot.values,
	);
	return {
		...(lowerBound !== null ? { lowerBound } : {}),
		...(upperBound !== null ? { upperBound } : {}),
	};
}

function computeResourceSnapshot(
	resourceId: string,
	before: PlayerSnapshot,
	after: PlayerSnapshot,
):
	| {
			snapshot: ResourceValueSnapshot;
			change: SignedDelta;
	  }
	| undefined {
	const previous = resolveResourceValue(before, resourceId);
	const current = resolveResourceValue(after, resourceId);
	const beforeValue = typeof previous === 'number' ? previous : 0;
	const afterValue = typeof current === 'number' ? current : 0;
	const delta = afterValue - beforeValue;
	if (!isMeaningfulDelta(delta)) {
		return undefined;
	}
	const change: SignedDelta = {
		before: typeof previous === 'number' ? previous : afterValue - delta,
		after: typeof current === 'number' ? current : beforeValue + delta,
		delta,
	};
	const snapshot: ResourceValueSnapshot = {
		id: resourceId,
		current: change.after,
		delta,
		...resolveBounds(after, resourceId),
		...(typeof previous === 'number' ? { previous } : {}),
	};
	return { snapshot, change };
}

function describeResourceChange(
	key: string,
	resourceId: string,
	metadata: ResourceMetadataSnapshot,
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	sources: Record<string, string> | undefined,
): string | undefined {
	const diff = computeResourceSnapshot(resourceId, before, after);
	if (!diff) {
		return undefined;
	}
	const summary = formatResourceSummary(metadata, diff.snapshot);
	const suffix = formatResourceSource(metadata, diff.change, sources?.[key]);
	return suffix ? `${summary}${suffix}` : summary;
}
function describePercentBreakdown(
	resourceId: string,
	change: SignedDelta,
	player: Pick<PlayerSnapshot, 'values'>,
	step: StepEffects,
	_assets: TranslationAssets,
	metadataSelectors: TranslationResourceMetadataSelectors,
): string | undefined {
	const breakdown = findResourcePctBreakdown(step, resourceId);
	if (!breakdown || change.delta <= 0) {
		return undefined;
	}
	// breakdown.resourceId is the evaluator resource (e.g., population role)
	// It's already a full resource ID - no prefix construction needed
	const evaluatorResourceId = breakdown.resourceId;
	const count = player.values?.[evaluatorResourceId] ?? 0;
	const evaluatorMetadata = metadataSelectors.get(evaluatorResourceId);
	const evaluatorIcon = evaluatorMetadata?.icon ?? '';
	// breakdown.percentSourceId is the percent source resource (e.g., growth)
	const percentSourceId = breakdown.percentSourceId;
	const percentValue = player.values?.[percentSourceId] ?? 0;
	const percentMetadata = metadataSelectors.get(percentSourceId);
	const percentIcon = percentMetadata?.icon ?? '';
	// Format values using resource metadata
	const formatValue = (id: string, value: number) => {
		const meta = metadataSelectors.get(id);
		return meta?.displayAsPercent ? `${value * 100}%` : String(value);
	};
	const percentDisplay = formatValue(percentSourceId, percentValue);
	const baseValue = formatValue(resourceId, change.before);
	const totalValue = formatValue(resourceId, change.after);
	// Use metadata for target resource icon
	const resourceMeta = metadataSelectors.get(resourceId);
	const resourceIcon = resourceMeta?.icon ?? '';
	return formatPercentBreakdown(
		resourceIcon,
		baseValue,
		evaluatorIcon,
		count,
		percentIcon,
		percentDisplay,
		totalValue,
	);
}
// Resources are handled uniformly by appendResourceChanges - no ID-based
// filtering. All resources get source icons when available. Percent
// breakdown formatting is handled by appendPercentBreakdownChanges based on
// effect metadata, not resource ID patterns.

export function appendResourceChanges(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	resourceKeys: string[],
	_assets: TranslationAssets,
	metadataSelectors: TranslationResourceMetadataSelectors,
	sources?: Record<string, string>,
	options?: { trackByKey?: Map<string, ActionDiffChange> },
): ActionDiffChange[] {
	const changes: ActionDiffChange[] = [];
	// Process ALL resource keys - resource IDs are unified resource IDs
	for (const resourceId of resourceKeys) {
		const metadata = metadataSelectors.get(resourceId);
		const summary = describeResourceChange(
			resourceId,
			resourceId,
			metadata,
			before,
			after,
			sources,
		);
		if (!summary) {
			continue;
		}
		const node: ActionDiffChange = {
			summary,
			meta: { resourceKey: resourceId },
		};
		if (options?.trackByKey) {
			options.trackByKey.set(resourceId, node);
		}
		changes.push(node);
	}
	return changes;
}

function collectChangedKeys(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): string[] {
	const keys = new Set<string>();
	// Collect all keys with changes from values
	for (const key of Object.keys(before.values ?? {})) {
		keys.add(key);
	}
	for (const key of Object.keys(after.values ?? {})) {
		keys.add(key);
	}
	return Array.from(keys);
}

export function appendPercentBreakdownChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	player: Pick<PlayerSnapshot, 'values'>,
	step: StepEffects,
	assets: TranslationAssets,
	metadataSelectors: TranslationResourceMetadataSelectors,
) {
	// This function handles resources that need percent breakdown display
	// (e.g., growth effects like Legion * Growth = Army Strength).
	// Resources are identified by having a percent breakdown effect, not by ID.
	if (!step) {
		return;
	}
	// Collect all changed resource keys - these are unified resource IDs
	const changedKeys = collectChangedKeys(before, after);
	for (const resourceId of changedKeys) {
		const metadata = metadataSelectors.get(resourceId);
		const diff = computeResourceSnapshot(resourceId, before, after);
		if (!diff) {
			continue;
		}
		// Check if this resource displays as percent - use metadata
		const displaysAsPercent =
			metadata.displayAsPercent || statDisplaysAsPercent(resourceId, assets);
		if (displaysAsPercent) {
			// Percent-based resources don't need breakdown
			const summary = formatResourceSummary(metadata, diff.snapshot);
			changes.push(summary);
			continue;
		}
		// Check if there's a percent breakdown effect for this resource
		const breakdown = describePercentBreakdown(
			resourceId,
			diff.change,
			player,
			step,
			assets,
			metadataSelectors,
		);
		if (breakdown) {
			// Only add entries that have breakdown - others handled elsewhere
			const summary = formatResourceSummary(metadata, diff.snapshot);
			changes.push(`${summary}${breakdown}`);
		}
	}
}
function totalSlots(lands: PlayerSnapshot['lands']): number {
	return lands.reduce((sum, land) => sum + land.slotsMax, 0);
}

function collectNewLandSlots(
	before: PlayerSnapshot,
	lands: PlayerSnapshot['lands'],
): number {
	const additions = lands.filter((land) => {
		return !before.lands.some((prev) => {
			return prev.id === land.id;
		});
	});
	return totalSlots(additions);
}

export function appendSlotChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	assets: TranslationAssets,
) {
	const beforeSlots = totalSlots(before.lands);
	const afterSlots = totalSlots(after.lands);
	const newLandSlots = collectNewLandSlots(before, after.lands);
	const slotDelta = afterSlots - newLandSlots - beforeSlots;
	if (slotDelta === 0) {
		return;
	}
	const change = signedNumber(slotDelta);
	const slotRange = `(${beforeSlots}→${beforeSlots + slotDelta})`;
	const slotSummaryParts = [assets.slot.icon, assets.slot.label, change];
	const slotSummary = `${slotSummaryParts.join(' ')} `;
	changes.push(`${slotSummary}${slotRange}`);
}
