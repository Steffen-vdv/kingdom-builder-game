import { formatStatValue, statDisplaysAsPercent } from '../../utils/stats';
import { findStatPctBreakdown, type StepEffects } from './statBreakdown';
import type { ActionDiffChange } from './diff';
import {
	buildSignedDelta,
	formatResourceSource,
	formatPercentBreakdown,
	signedNumber,
	type SignedDelta,
} from './diffFormatting';
import { type PlayerSnapshot } from './snapshots';
import type { TranslationAssets } from '../context';
import {
	formatResourceV2Summary,
	type ResourceV2ValueSnapshot,
} from '../resourceV2';
import type { TranslationDiffContext } from './resourceSources/context';
import {
	getLegacyMapping,
	inferResourceIdFromLegacy,
	type LegacyResourceMapping,
} from '../../components/common/resourceV2Mappings';

export {
	appendBuildingChanges,
	appendLandChanges,
} from './buildingLandChanges';

function resolveBounds(
	snapshot: PlayerSnapshot,
	resourceId: string,
): Pick<ResourceV2ValueSnapshot, 'lowerBound' | 'upperBound'> {
	const entry = snapshot.resourceBoundsV2?.[resourceId];
	if (!entry) {
		return {};
	}
	const lowerBound =
		entry.lowerBound !== undefined && entry.lowerBound !== null
			? entry.lowerBound
			: undefined;
	const upperBound =
		entry.upperBound !== undefined && entry.upperBound !== null
			? entry.upperBound
			: undefined;
	return {
		...(lowerBound !== undefined ? { lowerBound } : {}),
		...(upperBound !== undefined ? { upperBound } : {}),
	};
}

function readResourceValue(
	snapshot: PlayerSnapshot,
	resourceId: string,
): number | undefined {
	const values = snapshot.resourcesV2;
	if (values && typeof values[resourceId] === 'number') {
		return values[resourceId];
	}
	const mapping = getLegacyMapping(resourceId);
	if (!mapping) {
		return undefined;
	}
	const { bucket, key } = mapping;
	if (bucket === 'resources') {
		const value = snapshot.resources[key];
		return typeof value === 'number' ? value : undefined;
	}
	if (bucket === 'stats') {
		const value = snapshot.stats[key];
		return typeof value === 'number' ? value : undefined;
	}
	const value = snapshot.population[key];
	return typeof value === 'number' ? value : undefined;
}

function describeStatBreakdown(
	legacyKey: string,
	change: SignedDelta,
	player: Pick<PlayerSnapshot, 'population' | 'stats'>,
	step: StepEffects | undefined,
	assets: TranslationAssets,
): string | undefined {
	if (!step) {
		return undefined;
	}
	const breakdown = findStatPctBreakdown(step, legacyKey);
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
	const growthValue = formatStatValue(pctStat, growth, assets);
	const baseValue = formatStatValue(legacyKey, change.before, assets);
	const totalValue = formatStatValue(legacyKey, change.after, assets);
	return formatPercentBreakdown(
		assets.stats[legacyKey]?.icon ?? '',
		baseValue,
		popIcon,
		count,
		growthIcon,
		growthValue,
		totalValue,
	);
}

function buildResourceDiff(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	resourceId: string,
): { snapshot: ResourceV2ValueSnapshot; change: SignedDelta } | undefined {
	const beforeValue = readResourceValue(before, resourceId) ?? 0;
	const afterValue = readResourceValue(after, resourceId) ?? 0;
	const change = buildSignedDelta(beforeValue, afterValue);
	if (change.delta === 0) {
		return undefined;
	}
	const bounds = resolveBounds(after, resourceId);
	const snapshot: ResourceV2ValueSnapshot = {
		id: resourceId,
		current: afterValue,
		previous: beforeValue,
		delta: change.delta,
		...bounds,
	};
	return { snapshot, change };
}

interface ResourceChangeOptions {
	trackById?: Map<string, ActionDiffChange>;
	step?: StepEffects;
}

function appendStatDetails(
	summary: string,
	legacy: LegacyResourceMapping | undefined,
	change: SignedDelta,
	after: PlayerSnapshot,
	step: StepEffects | undefined,
	assets: TranslationAssets,
): string {
	if (!legacy || legacy.bucket !== 'stats') {
		return summary;
	}
	if (statDisplaysAsPercent(legacy.key, assets)) {
		return summary;
	}
	const breakdown = describeStatBreakdown(
		legacy.key,
		change,
		after,
		step,
		assets,
	);
	if (!breakdown) {
		return summary;
	}
	return `${summary}${breakdown}`;
}

export function appendResourceV2Changes(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	resourceIds: readonly string[],
	diffContext: TranslationDiffContext,
	sources?: Record<string, string>,
	options: ResourceChangeOptions = {},
): ActionDiffChange[] {
	const changes: ActionDiffChange[] = [];
	for (const resourceId of resourceIds) {
		const diff = buildResourceDiff(before, after, resourceId);
		if (!diff) {
			continue;
		}
		const metadata = diffContext.resourceMetadataV2.get(resourceId);
		let summary = formatResourceV2Summary(metadata, diff.snapshot);
		const legacy = getLegacyMapping(resourceId);
		const sourceKey =
			sources?.[resourceId] ?? (legacy ? sources?.[legacy.key] : undefined);
		if (sourceKey) {
			summary +=
				formatResourceSource(
					metadata.icon,
					metadata.id,
					diff.change,
					sourceKey,
				) ?? '';
		}
		summary = appendStatDetails(
			summary,
			legacy,
			diff.change,
			after,
			options.step,
			diffContext.assets,
		);
		const node: ActionDiffChange = {
			summary,
			meta: { resourceId },
		};
		if (legacy) {
			node.meta = {
				...node.meta,
				legacyKey: legacy.key,
				legacyBucket: legacy.bucket,
			};
		}
		if (options.trackById) {
			options.trackById.set(resourceId, node);
		}
		changes.push(node);
	}
	return changes;
}

export function normalizeResourceIds(
	legacyKeys: readonly string[] | undefined,
	diffContext: TranslationDiffContext,
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): string[] {
	const ids = new Set<string>();
	const add = (id: string | undefined) => {
		if (id) {
			ids.add(id);
		}
	};
	if (legacyKeys) {
		for (const key of legacyKeys) {
			add(inferResourceIdFromLegacy(key));
			if (key.includes(':')) {
				add(key);
			}
		}
	}
	const legacySources = [
		...Object.keys(before.resources),
		...Object.keys(after.resources),
		...Object.keys(before.stats),
		...Object.keys(after.stats),
		...Object.keys(before.population),
		...Object.keys(after.population),
	];
	for (const key of legacySources) {
		add(inferResourceIdFromLegacy(key));
	}
	if (before.resourcesV2) {
		Object.keys(before.resourcesV2).forEach(add);
	}
	if (after.resourcesV2) {
		Object.keys(after.resourcesV2).forEach(add);
	}
	diffContext.resourceMetadataV2.list().forEach((metadata) => add(metadata.id));
	diffContext.signedResourceGains.list().forEach((entry) => {
		if (entry.amount === 0) {
			return;
		}
		if (entry.key.includes(':')) {
			add(entry.key);
		} else {
			add(inferResourceIdFromLegacy(entry.key));
		}
	});
	return Array.from(ids);
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
