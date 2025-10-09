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
import type { TranslationDiffContext } from './resourceSources/context';
import type { TranslationStatDefinition } from '../context/defaultInfo';

export {
	appendBuildingChanges,
	appendLandChanges,
} from './buildingLandChanges';

type ResourceKey = string;

function getResourceDefinition(
	context: TranslationDiffContext,
	key: ResourceKey,
) {
	return context.resources[key];
}

function getStatDefinition(
	context: TranslationDiffContext,
	key: string,
): TranslationStatDefinition | undefined {
	return context.stats[key];
}

function statDisplaysAsPercent(
	context: TranslationDiffContext,
	key: string,
): boolean {
	return Boolean(getStatDefinition(context, key)?.percent);
}

function formatStatValue(
	context: TranslationDiffContext,
	key: string,
	value: number,
): string {
	return statDisplaysAsPercent(context, key) ? `${value * 100}%` : String(value);
}

function describeResourceChange(
	key: ResourceKey,
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: TranslationDiffContext,
	sources?: Record<string, string>,
): string | undefined {
	const change = buildSignedDelta(
		before.resources[key] ?? 0,
		after.resources[key] ?? 0,
	);
	if (change.delta === 0) {
		return undefined;
	}
	const info = getResourceDefinition(context, key);
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

function describeStatBreakdown(
	key: string,
	change: SignedDelta,
	player: Pick<PlayerSnapshot, 'population' | 'stats'>,
	step: StepEffects,
	context: TranslationDiffContext,
): string | undefined {
	const breakdown = findStatPctBreakdown(step, key);
	if (!breakdown || change.delta <= 0) {
		return undefined;
	}
	const role = breakdown.role as string;
	const count = player.population[role] ?? 0;
	const populationDefinition = context.populations.has(role)
		? context.populations.get(role)
		: undefined;
	const popIcon = populationDefinition?.icon || context.info.population.icon || '';
	const pctStat = breakdown.percentStat as string;
	const growth = player.stats[pctStat] ?? 0;
	const growthIcon = getStatDefinition(context, pctStat)?.icon || '';
	const growthValue = formatStatValue(context, breakdown.percentStat, growth);
	const baseValue = formatStatValue(context, key, change.before);
	const totalValue = formatStatValue(context, key, change.after);
	return formatPercentBreakdown(
		getStatDefinition(context, key)?.icon || '',
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
	context: TranslationDiffContext,
	resourceKeys: ResourceKey[],
	sources?: Record<string, string>,
) {
	for (const key of resourceKeys) {
		const line = describeResourceChange(key, before, after, context, sources);
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
	context: TranslationDiffContext,
) {
	for (const key of Object.keys(after.stats)) {
		const change = buildSignedDelta(
			before.stats[key] ?? 0,
			after.stats[key] ?? 0,
		);
		if (change.delta === 0) {
			continue;
		}
		const info = getStatDefinition(context, key);
		const label = info?.label ?? key;
		const icon = info?.icon;
		const line = formatStatChange(label, icon, key, change);
		if (statDisplaysAsPercent(context, key)) {
			changes.push(line);
			continue;
		}
		const breakdown = describeStatBreakdown(
			key,
			change,
			player,
			step,
			context,
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
	context: TranslationDiffContext,
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
	const slotInfo = context.info.slot;
	const slotSummaryParts = [slotInfo.icon, slotInfo.label, change];
	const slotSummary = `${slotSummaryParts.join(' ')} `;
	changes.push(`${slotSummary}${slotRange}`);
}
