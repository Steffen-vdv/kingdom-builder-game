import { formatStatValue, statDisplaysAsPercent } from '../../utils/stats';
import { findStatPctBreakdown, type StepEffects } from './statBreakdown';
import type { ActionDiffChange } from './diff';
import {
	buildSignedDelta,
	formatResourceChange,
	formatResourceSource,
	formatStatChange,
	formatPercentBreakdown,
	signedNumber,
	type SignedDelta,
} from './diffFormatting';
import { type PlayerSnapshot } from './snapshots';
import type { TranslationAssets } from '../context';
import { selectResourceDisplay } from '../context/assetSelectors';
export {
	appendBuildingChanges,
	appendLandChanges,
} from './buildingLandChanges';

function describeResourceChange(
	key: string,
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	assets: TranslationAssets,
	sources?: Record<string, string>,
): string | undefined {
	const change = buildSignedDelta(
		before.resources[key] ?? 0,
		after.resources[key] ?? 0,
	);
	if (change.delta === 0) {
		return undefined;
	}
	const display = selectResourceDisplay(assets, key);
	const base = formatResourceChange(display.label, display.icon, change);
	const resourceSourceArgs: Parameters<typeof formatResourceSource> = [
		display.icon,
		key,
		change,
		sources?.[key],
	];
	const suffix = formatResourceSource(...resourceSourceArgs);
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
	assets: TranslationAssets,
	sources?: Record<string, string>,
	options?: { trackByKey?: Map<string, ActionDiffChange> },
): ActionDiffChange[] {
	const changes: ActionDiffChange[] = [];
	for (const key of resourceKeys) {
		const summary = describeResourceChange(key, before, after, assets, sources);
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
) {
	for (const key of Object.keys(after.stats)) {
		const change = buildSignedDelta(
			before.stats[key] ?? 0,
			after.stats[key] ?? 0,
		);
		if (change.delta === 0) {
			continue;
		}
		const info = assets.stats[key];
		const label = info?.label ?? key;
		const icon = info?.icon;
		const line = formatStatChange(label, icon, key, change, assets);
		if (statDisplaysAsPercent(key, assets)) {
			changes.push(line);
			continue;
		}
		const breakdown = describeStatBreakdown(key, change, player, step, assets);
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
