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
	mapping?: ResourceV2LegacyMapping,
): number | undefined {
	const values = snapshot.valuesV2;
	if (values && typeof values[resourceId] === 'number') {
		return values[resourceId];
	}
	const resolvedMapping = mapping ?? getLegacyMapping(resourceId);
	if (!resolvedMapping) {
		return undefined;
	}
	if (resolvedMapping.bucket === 'resources') {
		const value = snapshot.resources[resolvedMapping.key];
		return typeof value === 'number' ? value : undefined;
	}
	if (resolvedMapping.bucket === 'stats') {
		const value = snapshot.stats[resolvedMapping.key];
		return typeof value === 'number' ? value : undefined;
	}
	const value = snapshot.population[resolvedMapping.key];
	return typeof value === 'number' ? value : undefined;
}

function resolveBounds(
	snapshot: PlayerSnapshot,
	resourceId: string,
): Pick<ResourceV2ValueSnapshot, 'lowerBound' | 'upperBound'> {
	const bounds = snapshot.resourceBoundsV2?.[resourceId];
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
	player: Pick<PlayerSnapshot, 'population' | 'stats'>,
	step: StepEffects,
	assets: TranslationAssets,
): string | undefined {
	const breakdown = findStatPctBreakdown(step, key);
	if (!breakdown || change.delta <= 0) {
		return undefined;
	}
	const role = breakdown.role;
	const count = player.population[role] ?? 0;
	const popIcon =
		assets.populations[role]?.icon ?? assets.population.icon ?? '';
	const pctStat = breakdown.percentStat;
	const growth = player.stats[pctStat] ?? 0;
	const growthIcon = assets.stats[pctStat]?.icon ?? '';
	const growthValue = formatStatValue(breakdown.percentStat, growth, assets);
	const baseValue = formatStatValue(key, change.before, assets);
	const totalValue = formatStatValue(key, change.after, assets);
	return formatPercentBreakdown(
		assets.stats[key]?.icon ?? '',
		baseValue,
		popIcon,
		count,
		growthIcon,
		growthValue,
		totalValue,
	);
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
export function appendStatChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	player: Pick<PlayerSnapshot, 'population' | 'stats'>,
	step: StepEffects,
	assets: TranslationAssets,
	metadataSelectors: TranslationResourceV2MetadataSelectors,
) {
	for (const key of Object.keys(after.stats)) {
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
