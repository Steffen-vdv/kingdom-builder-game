import { STATS, SLOT_INFO } from '@kingdom-builder/contents';
import type { PopulationConfig } from '@kingdom-builder/protocol';
import type {
	TranslationRegistry,
	TranslationResourceRegistry,
} from '../context';
import { formatStatValue, statDisplaysAsPercent } from '../../utils/stats';
import { findStatPctBreakdown, type StepEffects } from './statBreakdown';
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
export {
	appendBuildingChanges,
	appendLandChanges,
} from './buildingLandChanges';

function describeResourceChange(
	key: string,
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	resources: TranslationResourceRegistry,
	sources?: Record<string, string>,
): string | undefined {
	const change = buildSignedDelta(
		before.resources[key] ?? 0,
		after.resources[key] ?? 0,
	);
	if (change.delta === 0) {
		return undefined;
	}
	const info = resources.get(key);
	const label = info?.label ?? key;
	const base = formatResourceChange(label, info?.icon, change);
	const resourceSourceArgs: Parameters<typeof formatResourceSource> = [
		info?.icon,
		key,
		change,
		sources?.[key],
	];
	const suffix = formatResourceSource(...resourceSourceArgs);
	return suffix ? `${base}${suffix}` : base;
}
function resolvePopulationIcon(
	populations: TranslationRegistry<PopulationConfig>,
	roleId: string | undefined,
): string {
	if (roleId && populations.has(roleId)) {
		try {
			return populations.get(roleId)?.icon || '';
		} catch {
			return '';
		}
	}
	for (const key of populations.keys()) {
		try {
			const icon = populations.get(key)?.icon;
			if (icon) {
				return icon;
			}
		} catch {
			// ignore missing definitions
		}
	}
	return '';
}

function describeStatBreakdown(
	key: string,
	change: SignedDelta,
	player: Pick<PlayerSnapshot, 'population' | 'stats'>,
	step: StepEffects,
	populations: TranslationRegistry<PopulationConfig>,
): string | undefined {
	const breakdown = findStatPctBreakdown(step, key);
	if (!breakdown || change.delta <= 0) {
		return undefined;
	}
	const role = breakdown.role;
	const count = role ? (player.population[role] ?? 0) : 0;
	const popIcon = resolvePopulationIcon(populations, role);
	const pctStat = breakdown.percentStat as keyof typeof STATS;
	const growth = player.stats[pctStat] ?? 0;
	const growthIcon = STATS[pctStat]?.icon || '';
	const growthValue = formatStatValue(breakdown.percentStat, growth);
	const baseValue = formatStatValue(key, change.before);
	const totalValue = formatStatValue(key, change.after);
	return formatPercentBreakdown(
		STATS[key as keyof typeof STATS]?.icon || '',
		baseValue,
		popIcon,
		count,
		growthIcon,
		growthValue,
		totalValue,
	);
}
export function appendResourceChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	resourceKeys: readonly string[],
	resources: TranslationResourceRegistry,
	sources?: Record<string, string>,
) {
	for (const key of resourceKeys) {
		const line = describeResourceChange(key, before, after, resources, sources);
		if (line) {
			changes.push(line);
		}
	}
}
export function appendStatChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	player: Pick<PlayerSnapshot, 'population' | 'stats'>,
	step: StepEffects,
	populations: TranslationRegistry<PopulationConfig>,
) {
	for (const key of Object.keys(after.stats)) {
		const change = buildSignedDelta(
			before.stats[key] ?? 0,
			after.stats[key] ?? 0,
		);
		if (change.delta === 0) {
			continue;
		}
		const info = STATS[key as keyof typeof STATS];
		const label = info?.label ?? key;
		const icon = info?.icon;
		const line = formatStatChange(label, icon, key, change);
		if (statDisplaysAsPercent(key)) {
			changes.push(line);
			continue;
		}
		const breakdown = describeStatBreakdown(
			key,
			change,
			player,
			step,
			populations,
		);
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
	const slotSummaryParts = [SLOT_INFO.icon, SLOT_INFO.label, change];
	const slotSummary = `${slotSummaryParts.join(' ')} `;
	changes.push(`${slotSummary}${slotRange}`);
}
