import { statDisplaysAsPercent } from '../../utils/stats';
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
	TranslationResourceV2MetadataSelectors,
} from '../context';
import {
	formatResourceV2Summary,
	getLegacyMapping,
	getResourceIdForLegacy,
	type ResourceV2LegacyMapping,
	type ResourceV2MetadataSnapshot,
	type ResourceV2ValueSnapshot,
} from '../resourceV2';
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
	_mapping?: ResourceV2LegacyMapping,
): number | undefined {
	// Use valuesV2 directly - all resources, stats, and population are unified
	const values = snapshot.valuesV2;
	if (values && typeof values[resourceId] === 'number') {
		return values[resourceId];
	}
	return undefined;
}

function resolveBounds(
	snapshot: PlayerSnapshot,
	resourceId: string,
): Pick<ResourceV2ValueSnapshot, 'lowerBound' | 'upperBound'> {
	const bounds = snapshot.resourceBoundsV2[resourceId];
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

function computeResourceV2Snapshot(
	resourceId: string,
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	mapping?: ResourceV2LegacyMapping,
):
	| {
			snapshot: ResourceV2ValueSnapshot;
			change: SignedDelta;
	  }
	| undefined {
	const previous = resolveResourceValue(before, resourceId, mapping);
	const current = resolveResourceValue(after, resourceId, mapping);
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
	const snapshot: ResourceV2ValueSnapshot = {
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
	metadata: ResourceV2MetadataSnapshot,
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	sources: Record<string, string> | undefined,
): string | undefined {
	const mapping: ResourceV2LegacyMapping | undefined = getLegacyMapping(
		resourceId,
	) ?? {
		bucket: 'resources',
		key,
	};
	const diff = computeResourceV2Snapshot(resourceId, before, after, mapping);
	if (!diff) {
		return undefined;
	}
	const summary = formatResourceV2Summary(metadata, diff.snapshot);
	const suffix = formatResourceSource(metadata, diff.change, sources?.[key]);
	return suffix ? `${summary}${suffix}` : summary;
}
function describeStatBreakdown(
	key: string,
	change: SignedDelta,
	player: Pick<PlayerSnapshot, 'valuesV2'>,
	step: StepEffects,
	_assets: TranslationAssets,
	metadataSelectors: TranslationResourceV2MetadataSelectors,
): string | undefined {
	const breakdown = findStatPctBreakdown(step, key);
	if (!breakdown || change.delta <= 0) {
		return undefined;
	}
	const role = breakdown.role;
	// Role should be a V2 id - use it directly for V2 metadata lookup
	const populationKey = role.startsWith('resource:')
		? role
		: `resource:core:${role}`;
	const count = player.valuesV2?.[populationKey] ?? 0;
	// Use V2 metadata for population icon
	const popMetadata = metadataSelectors.get(populationKey);
	const popIcon = popMetadata?.icon ?? '';
	const pctStat = breakdown.percentStat;
	// All values are now in valuesV2
	const growth = player.valuesV2?.[pctStat] ?? 0;
	// Use V2 metadata for percent stat icon
	const pctStatMetadata = metadataSelectors.get(pctStat);
	const growthIcon = pctStatMetadata?.icon ?? '';
	// Format values using V2 metadata
	const formatValue = (id: string, value: number) => {
		const meta = metadataSelectors.get(id);
		return meta?.displayAsPercent ? `${value * 100}%` : String(value);
	};
	const growthValue = formatValue(pctStat, growth);
	const baseValue = formatValue(key, change.before);
	const totalValue = formatValue(key, change.after);
	// Use V2 metadata for target resource icon
	const statMetadata = metadataSelectors.get(key);
	const statIcon = statMetadata?.icon ?? '';
	return formatPercentBreakdown(
		statIcon,
		baseValue,
		popIcon,
		count,
		growthIcon,
		growthValue,
		totalValue,
	);
}
// Resources are handled uniformly by appendResourceChanges - no ID-based
// filtering. All V2 resources get source icons when available. Stat-specific
// formatting (percent breakdowns for growth effects) is handled by
// appendStatChanges based on effect metadata, not resource ID patterns.

export function appendResourceChanges(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	resourceKeys: string[],
	_assets: TranslationAssets,
	metadataSelectors: TranslationResourceV2MetadataSelectors,
	sources?: Record<string, string>,
	options?: { trackByKey?: Map<string, ActionDiffChange> },
): ActionDiffChange[] {
	const changes: ActionDiffChange[] = [];
	// Process ALL resource keys - no ID-based filtering
	for (const key of resourceKeys) {
		const resourceId = getResourceIdForLegacy('resources', key) ?? key;
		const metadata = metadataSelectors.get(resourceId);
		const summary = describeResourceChange(
			key,
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
			meta: { resourceKey: key },
		};
		if (options?.trackByKey) {
			options.trackByKey.set(key, node);
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
	// Collect all keys with changes from valuesV2
	for (const key of Object.keys(before.valuesV2 ?? {})) {
		keys.add(key);
	}
	for (const key of Object.keys(after.valuesV2 ?? {})) {
		keys.add(key);
	}
	return Array.from(keys);
}

export function appendStatChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	player: Pick<PlayerSnapshot, 'valuesV2'>,
	step: StepEffects,
	assets: TranslationAssets,
	metadataSelectors: TranslationResourceV2MetadataSelectors,
) {
	// This function handles resources that need percent breakdown display
	// (e.g., growth effects like Legion * Growth = Army Strength).
	// Resources are identified by having a percent breakdown effect, not by ID.
	if (!step) {
		return;
	}
	// Collect all changed resource keys
	const changedKeys = collectChangedKeys(before, after);
	for (const key of changedKeys) {
		const resourceId = getResourceIdForLegacy('stats', key) ?? key;
		const metadata = metadataSelectors.get(resourceId);
		const mapping: ResourceV2LegacyMapping | undefined = getLegacyMapping(
			resourceId,
		) ?? {
			bucket: 'stats',
			key,
		};
		const diff = computeResourceV2Snapshot(resourceId, before, after, mapping);
		if (!diff) {
			continue;
		}
		// Check if this resource displays as percent - use V2 metadata
		const displaysAsPercent =
			metadata.displayAsPercent || statDisplaysAsPercent(key, assets);
		if (displaysAsPercent) {
			// Percent-based resources don't need breakdown
			const summary = formatResourceV2Summary(metadata, diff.snapshot);
			changes.push(summary);
			continue;
		}
		// Check if there's a percent breakdown effect for this resource
		const breakdown = describeStatBreakdown(
			key,
			diff.change,
			player,
			step,
			assets,
			metadataSelectors,
		);
		if (breakdown) {
			// Only add entries that have breakdown - others handled elsewhere
			const summary = formatResourceV2Summary(metadata, diff.snapshot);
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
