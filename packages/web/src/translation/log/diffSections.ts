import { type EngineContext } from '@kingdom-builder/engine';
import {
	RESOURCES,
	STATS,
	POPULATION_ROLES,
	LAND_INFO,
	SLOT_INFO,
	type ResourceKey,
} from '@kingdom-builder/contents';
import { formatStatValue, statDisplaysAsPercent } from '../../utils/stats';
import { logContent } from '../content';
import { findStatPctBreakdown, type StepEffects } from './statBreakdown';
import { resolvePassivePresentation } from './passives';
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

function describeResourceChange(
	key: ResourceKey,
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	sources?: Record<string, string>,
): string | undefined {
	const change = buildSignedDelta(
		before.resources[key] ?? 0,
		after.resources[key] ?? 0,
	);
	if (change.delta === 0) {
		return undefined;
	}
	const info = RESOURCES[key];
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
	player: {
		population: Record<string, number>;
		stats: Record<string, number>;
	},
	step: StepEffects,
): string | undefined {
	const breakdown = findStatPctBreakdown(step, key);
	if (!breakdown || change.delta <= 0) {
		return undefined;
	}
	const role = breakdown.role as keyof typeof POPULATION_ROLES;
	const count = player.population[role] ?? 0;
	const popIcon = POPULATION_ROLES[role]?.icon || '';
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
	resourceKeys: ResourceKey[],
	sources?: Record<string, string>,
) {
	for (const key of resourceKeys) {
		const line = describeResourceChange(key, before, after, sources);
		if (line) {
			changes.push(line);
		}
	}
}
export function appendStatChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: EngineContext,
	step: StepEffects,
) {
	const player = context.activePlayer;
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
		const breakdown = describeStatBreakdown(key, change, player, step);
		if (breakdown) {
			changes.push(`${line}${breakdown}`);
		} else {
			changes.push(line);
		}
	}
}
export function appendBuildingChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: EngineContext,
) {
	const previous = new Set(before.buildings);
	const next = new Set(after.buildings);
	for (const id of next) {
		if (previous.has(id)) {
			continue;
		}
		const label = logContent('building', id, context)[0] ?? id;
		changes.push(`${label} built`);
	}
}
export function appendLandChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: EngineContext,
) {
	for (const land of after.lands) {
		const previous = before.lands.find((item) => item.id === land.id);
		if (!previous) {
			changes.push(`${LAND_INFO.icon} +1 ${LAND_INFO.label}`);
			continue;
		}
		for (const development of land.developments) {
			if (previous.developments.includes(development)) {
				continue;
			}
			const info = logContent('development', development, context);
			const label = info[0] ?? development;
			changes.push(`${LAND_INFO.icon} +${label}`);
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
function createPassiveMap(passives: PlayerSnapshot['passives']) {
	return new Map(passives.map((passive) => [passive.id, passive]));
}

function collectNewBuildings(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): Set<string> {
	const previous = new Set(before.buildings);
	const additions = after.buildings.filter((id) => !previous.has(id));
	return new Set(additions);
}

function isBuildingPassive(
	passiveId: string,
	newBuildings: Set<string>,
): boolean {
	for (const buildingId of newBuildings) {
		if (passiveId === buildingId || passiveId.startsWith(`${buildingId}_`)) {
			return true;
		}
	}
	return false;
}

function decoratePassiveLabel(icon: string, label: string): string {
	return icon ? `${icon}${label}` : label;
}

export function appendPassiveChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
) {
	const previous = createPassiveMap(before.passives);
	const next = createPassiveMap(after.passives);
	const newBuildings = collectNewBuildings(before, after);
	for (const [id, passive] of next) {
		if (previous.has(id)) {
			continue;
		}
		if (isBuildingPassive(id, newBuildings)) {
			continue;
		}
		const { icon, label, removal } = resolvePassivePresentation(passive);
		const decoratedLabel = decoratePassiveLabel(icon, label);
		const suffix = removal ? ` (${removal})` : '';
		changes.push(`${decoratedLabel} activated${suffix}`);
	}
	for (const [id, passive] of previous) {
		if (next.has(id)) {
			continue;
		}
		const { icon, label } = resolvePassivePresentation(passive);
		const decoratedLabel = decoratePassiveLabel(icon, label);
		changes.push(`${decoratedLabel} expired`);
	}
}
