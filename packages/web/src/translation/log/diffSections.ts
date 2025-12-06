import { formatStatValue, statDisplaysAsPercent } from '../../utils/stats';
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
	assets: TranslationAssets,
	metadataSelectors: TranslationResourceV2MetadataSelectors,
): string | undefined {
	const breakdown = findStatPctBreakdown(step, key);
	if (!breakdown || change.delta <= 0) {
		return undefined;
	}
	const role = breakdown.role;
	// Role can be a V2 id (resource:core:legion) or legacy short key
	// If it's already a V2 id, use it directly; otherwise construct the V2 id
	const populationKey = role.startsWith('resource:population:')
		? role
		: `resource:core:${role}`;
	const count = player.valuesV2?.[populationKey] ?? 0;
	// Use V2 metadata for population icon, fallback to legacy assets
	const popMetadata = metadataSelectors.get(populationKey);
	const popIcon =
		popMetadata?.icon ??
		assets.populations[role]?.icon ??
		assets.population.icon ??
		'';
	const pctStat = breakdown.percentStat;
	// Stats are now in valuesV2
	const growth = player.valuesV2?.[pctStat] ?? 0;
	// Use V2 metadata for stat icon, fallback to legacy assets
	const pctStatMetadata = metadataSelectors.get(pctStat);
	const growthIcon = pctStatMetadata?.icon ?? assets.stats[pctStat]?.icon ?? '';
	const growthValue = formatStatValue(breakdown.percentStat, growth, assets);
	const baseValue = formatStatValue(key, change.before, assets);
	const totalValue = formatStatValue(key, change.after, assets);
	// Use V2 metadata for target stat icon, fallback to legacy assets
	const statMetadata = metadataSelectors.get(key);
	const statIcon = statMetadata?.icon ?? assets.stats[key]?.icon ?? '';
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
const STAT_V2_PREFIX = 'resource:core:';

function isResourceKey(key: string): boolean {
	// Exclude stat keys - they're handled by appendStatChanges
	if (key.startsWith(STAT_V2_PREFIX)) {
		return false;
	}
	// Exclude legacy stat keys that can be mapped to V2 stat ids
	const statV2Id = getResourceIdForLegacy('stats', key);
	if (statV2Id !== undefined) {
		return false;
	}
	return true;
}

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
	// Filter out stat keys - they're handled by appendStatChanges
	const filteredKeys = resourceKeys.filter(isResourceKey);
	for (const key of filteredKeys) {
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

function collectStatKeys(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): string[] {
	const keys = new Set<string>();
	// Collect stat keys from valuesV2
	for (const key of Object.keys(before.valuesV2 ?? {})) {
		if (key.startsWith(STAT_V2_PREFIX)) {
			keys.add(key);
		}
	}
	for (const key of Object.keys(after.valuesV2 ?? {})) {
		if (key.startsWith(STAT_V2_PREFIX)) {
			keys.add(key);
		}
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
	// Collect stat keys from both legacy stats and V2 valuesV2
	const statKeys = collectStatKeys(before, after);
	for (const key of statKeys) {
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
		const summary = formatResourceV2Summary(metadata, diff.snapshot);
		if (statDisplaysAsPercent(key, assets)) {
			changes.push(summary);
			continue;
		}
		const breakdown = describeStatBreakdown(
			key,
			diff.change,
			player,
			step,
			assets,
			metadataSelectors,
		);
		if (breakdown) {
			changes.push(`${summary}${breakdown}`);
		} else {
			changes.push(summary);
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
