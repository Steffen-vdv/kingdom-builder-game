import { formatStatValue, statDisplaysAsPercent } from '../../utils/stats';
import { findStatPctBreakdown, type StepEffects } from './statBreakdown';
import type { ActionDiffChange } from './diff';
import {
	buildSignedDelta,
	formatResourceSource,
	formatStatChange,
	formatPercentBreakdown,
	signedNumber,
	type SignedDelta,
} from './diffFormatting';
import { type PlayerSnapshot } from './snapshots';
import type {
	TranslationAssets,
	TranslationResourceV2Metadata,
	TranslationResourceV2MetadataSelectors,
	TranslationSignedResourceGainSelectors,
} from '../context';
import {
	formatResourceV2Summary,
	formatResourceV2SignedMagnitude,
	type ResourceV2MetadataSnapshot,
	type ResourceV2ValueSnapshot,
} from '../resourceV2';
import {
	getLegacyMapping,
	getResourceIdForLegacy,
} from '../resourceV2/snapshots';
import type { TranslationDiffContext } from './resourceSources/context';
export {
	appendBuildingChanges,
	appendLandChanges,
} from './buildingLandChanges';

function readResourceValue(
	snapshot: PlayerSnapshot,
	resourceId: string,
): number {
	const values = snapshot.valuesV2;
	if (values) {
		const explicit = values[resourceId];
		if (typeof explicit === 'number') {
			return explicit;
		}
	}
	const legacy = getLegacyMapping(resourceId);
	if (legacy) {
		const bucket = legacy.bucket;
		const key = legacy.key;
		const source =
			bucket === 'resources'
				? snapshot.resources
				: bucket === 'stats'
					? snapshot.stats
					: snapshot.population;
		const value = source?.[key];
		if (typeof value === 'number') {
			return value;
		}
	}
	const fallback = snapshot.resources?.[resourceId];
	return typeof fallback === 'number' ? fallback : 0;
}

function describeResourceChange(
	resourceId: string,
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: TranslationDiffContext,
	sources?: Record<string, string>,
): string | undefined {
	const metadata = context.resourceMetadataV2.get(resourceId);
	const legacyMapping = getLegacyMapping(resourceId);
	const legacyResourceKey =
		legacyMapping && legacyMapping.bucket === 'resources'
			? legacyMapping.key
			: undefined;
	const assetInfo = legacyResourceKey
		? context.assets.resources[legacyResourceKey]
		: undefined;
	const decoratedMetadata: ResourceV2MetadataSnapshot = {
		...metadata,
		label: metadata.label || assetInfo?.label || resourceId,
		...(metadata.icon !== undefined
			? { icon: metadata.icon }
			: assetInfo?.icon
				? { icon: assetInfo.icon }
				: {}),
	};
	const beforeValue = readResourceValue(before, resourceId);
	const afterValue = readResourceValue(after, resourceId);
	const signedDelta = context.signedResourceGains.sumForResource(resourceId);
	const resolvedDelta =
		signedDelta !== 0 ? signedDelta : afterValue - beforeValue;
	if (resolvedDelta === 0 && beforeValue === afterValue) {
		return undefined;
	}
	const snapshot: ResourceV2ValueSnapshot = {
		id: resourceId,
		current: afterValue,
		previous: beforeValue,
		...(resolvedDelta !== 0 ? { delta: resolvedDelta } : {}),
	};
	const base = formatResourceV2Summary(decoratedMetadata, snapshot);
	const deltaText =
		resolvedDelta !== 0
			? formatResourceV2SignedMagnitude(resolvedDelta, decoratedMetadata)
			: undefined;
	const suffix = formatResourceSource(
		decoratedMetadata.icon,
		decoratedMetadata.label ?? resourceId,
		deltaText,
		sources?.[resourceId],
	);
	return suffix ? `${base}${suffix}` : base;
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
	context: TranslationDiffContext,
	sources?: Record<string, string>,
	options?: { trackByKey?: Map<string, ActionDiffChange> },
): ActionDiffChange[] {
	const changes: ActionDiffChange[] = [];
	for (const key of resourceKeys) {
		const summary = describeResourceChange(
			key,
			before,
			after,
			context,
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
	step: StepEffects | undefined,
	assets: TranslationAssets,
	metadata: TranslationResourceV2MetadataSelectors,
	signedGains: TranslationSignedResourceGainSelectors,
) {
	for (const key of Object.keys(after.stats)) {
		const change = buildSignedDelta(
			before.stats[key] ?? 0,
			after.stats[key] ?? 0,
		);
		if (change.delta === 0) {
			continue;
		}
		const resourceId = getResourceIdForLegacy('stats', key);
		const info = assets.stats[key];
		let line: string;
		if (typeof resourceId === 'string') {
			const statMetadata: TranslationResourceV2Metadata =
				metadata.get(resourceId);
			const decoratedMetadata: ResourceV2MetadataSnapshot = {
				...statMetadata,
				label: statMetadata.label || info?.label || key,
				...(statMetadata.icon !== undefined
					? { icon: statMetadata.icon }
					: info?.icon
						? { icon: info.icon }
						: {}),
			};
			const signedDelta = signedGains.sumForResource(resourceId);
			const resolvedDelta = signedDelta !== 0 ? signedDelta : change.delta;
			const snapshot = {
				id: resourceId,
				current: after.stats[key] ?? 0,
				previous: before.stats[key] ?? 0,
				...(resolvedDelta !== 0 ? { delta: resolvedDelta } : {}),
			} satisfies ResourceV2ValueSnapshot;
			line = formatResourceV2Summary(decoratedMetadata, snapshot);
		} else {
			const label = info?.label ?? key;
			const icon = info?.icon;
			line = formatStatChange(label, icon, key, change, assets);
		}
		if (statDisplaysAsPercent(key, assets)) {
			changes.push(line);
			continue;
		}
		const breakdown = step
			? describeStatBreakdown(key, change, player, step, assets)
			: undefined;
		if (breakdown) {
			changes.push(`${line}${breakdown}`);
		} else {
			changes.push(line);
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
