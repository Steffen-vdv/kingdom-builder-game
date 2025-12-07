import { statDisplaysAsPercent } from '../../utils/resourceSources';
import { findStatPctBreakdown, type StepEffects } from './statBreakdown';
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

function resolveBounds(
	snapshot: PlayerSnapshot,
	resourceId: string,
): Pick<ResourceValueSnapshot, 'lowerBound' | 'upperBound'> {
	const bounds = snapshot.resourceBounds[resourceId];
	if (!bounds) {
		return {};
	}
	const lowerBound =
		bounds.lowerBound !== undefined && bounds.lowerBound !== null
			? bounds.lowerBound
			: undefined;
	const upperBound =
		bounds.upperBound !== undefined && bounds.upperBound !== null
			? bounds.upperBound
			: undefined;
	return {
		...(lowerBound !== undefined ? { lowerBound } : {}),
		...(upperBound !== undefined ? { upperBound } : {}),
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
	const breakdown = findStatPctBreakdown(step, resourceId);
	if (!breakdown || change.delta <= 0) {
		return undefined;
	}
	const role = breakdown.role;
	// Role should be a id - use it directly for metadata lookup
	const populationKey = role.startsWith('resource:')
		? role
		: `resource:core:${role}`;
	const count = player.values?.[populationKey] ?? 0;
	// Use metadata for population icon
	const popMetadata = metadataSelectors.get(populationKey);
	const popIcon = popMetadata?.icon ?? '';
	const pctStat = breakdown.percentStat;
	// All values are now in values
	const growth = player.values?.[pctStat] ?? 0;
	// Use metadata for percent stat icon
	const pctStatMetadata = metadataSelectors.get(pctStat);
	const growthIcon = pctStatMetadata?.icon ?? '';
	// Format values using metadata
	const formatValue = (id: string, value: number) => {
		const meta = metadataSelectors.get(id);
		return meta?.displayAsPercent ? `${value * 100}%` : String(value);
	};
	const growthValue = formatValue(pctStat, growth);
	const baseValue = formatValue(resourceId, change.before);
	const totalValue = formatValue(resourceId, change.after);
	// Use metadata for target resource icon
	const resourceMeta = metadataSelectors.get(resourceId);
	const resourceIcon = resourceMeta?.icon ?? '';
	return formatPercentBreakdown(
		resourceIcon,
		baseValue,
		popIcon,
		count,
		growthIcon,
		growthValue,
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
	// Process ALL resource keys - resource IDs are IDs directly
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
	// Collect all changed resource keys - these are IDs directly
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
