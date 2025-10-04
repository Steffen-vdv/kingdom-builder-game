import { type EngineContext } from '@kingdom-builder/engine';
import {
	RESOURCES,
	STATS,
	POPULATION_ROLES,
	type ResourceKey,
} from '@kingdom-builder/contents';

import { formatStatValue, statDisplaysAsPercent } from '../../utils/stats';
import { collectResourceSources, type StepDef } from './metaIcons';
import { type PlayerSnapshot } from './playerSnapshot';
import { appendStructureChanges, findStatPctBreakdown } from './diffHelpers';

const formatValue = formatStatValue as (key: string, value: number) => string;
const displaysAsPercent = statDisplaysAsPercent as (key: string) => boolean;
type PopulationRoleKey = keyof typeof POPULATION_ROLES;
type StatLookupKey = keyof typeof STATS;

function buildGrowthEquation(
	breakdown: { role: string; percentStat: string },
	context: EngineContext,
	iconOnly: string,
	beforeStr: string,
	afterStr: string,
): string | undefined {
	const roleKey = breakdown.role as PopulationRoleKey;
	const populationState = context.activePlayer.population;
	const count = populationState[roleKey] ?? 0;
	const populationIcon = POPULATION_ROLES[roleKey]?.icon || '';
	const percentKey = breakdown.percentStat as StatLookupKey;
	const statsState = context.activePlayer.stats;
	const growth = statsState[percentKey] ?? 0;
	const growthIcon = STATS[percentKey]?.icon || '';
	const growthStr = formatValue(breakdown.percentStat, growth);
	const populationDetail = `${populationIcon}${count}`;
	const growthDetail = `${growthIcon}${growthStr}`;
	return [
		`${iconOnly}${beforeStr}`,
		'+',
		`(${populationDetail} * ${growthDetail})`,
		'=',
		`${iconOnly}${afterStr}`,
	].join(' ');
}

export function diffSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: EngineContext,
	resourceKeys: ResourceKey[] = Object.keys({
		...before.resources,
		...after.resources,
	}) as ResourceKey[],
): string[] {
	const changes: string[] = [];
	for (const key of resourceKeys) {
		const beforeValue = before.resources[key] ?? 0;
		const afterValue = after.resources[key] ?? 0;
		if (afterValue === beforeValue) {
			continue;
		}
		const info = RESOURCES[key];
		const icon = info?.icon ? `${info.icon} ` : '';
		const label = info?.label ?? key;
		const delta = afterValue - beforeValue;
		const deltaSign = delta >= 0 ? '+' : '';
		const deltaRange = `${beforeValue}→${afterValue}`;
		const resourceLine = [
			`${icon}${label}`,
			`${deltaSign}${delta}`,
			`(${deltaRange})`,
		].join(' ');
		changes.push(resourceLine);
	}
	for (const key of Object.keys(after.stats)) {
		const beforeValue = before.stats[key] ?? 0;
		const afterValue = after.stats[key] ?? 0;
		if (afterValue === beforeValue) {
			continue;
		}
		const info = STATS[key as StatLookupKey];
		const icon = info?.icon ? `${info.icon} ` : '';
		const label = info?.label ?? key;
		const delta = afterValue - beforeValue;
		if (displaysAsPercent(key)) {
			const beforePct = beforeValue * 100;
			const afterPct = afterValue * 100;
			const deltaPct = delta * 100;
			const percentSign = deltaPct >= 0 ? '+' : '';
			const percentRange = `${beforePct}→${afterPct}%`;
			const percentLine = [
				`${icon}${label}`,
				`${percentSign}${deltaPct}%`,
				`(${percentRange})`,
			].join(' ');
			changes.push(percentLine);
			continue;
		}
		const deltaSign = delta >= 0 ? '+' : '';
		const valueRange = `${beforeValue}→${afterValue}`;
		const statLine = [
			`${icon}${label}`,
			`${deltaSign}${delta}`,
			`(${valueRange})`,
		].join(' ');
		changes.push(statLine);
	}
	appendStructureChanges(changes, before, after, context);
	return changes;
}

export function diffStepSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	step: StepDef | undefined,
	context: EngineContext,
	resourceKeys: ResourceKey[] = Object.keys({
		...before.resources,
		...after.resources,
	}) as ResourceKey[],
): string[] {
	const changes: string[] = [];
	const sources = collectResourceSources(step, context);
	for (const key of resourceKeys) {
		const beforeValue = before.resources[key] ?? 0;
		const afterValue = after.resources[key] ?? 0;
		if (afterValue === beforeValue) {
			continue;
		}
		const info = RESOURCES[key];
		const icon = info?.icon ? `${info.icon} ` : '';
		const label = info?.label ?? key;
		const delta = afterValue - beforeValue;
		const deltaSign = delta >= 0 ? '+' : '';
		const valueRange = `${beforeValue}→${afterValue}`;
		const source = sources[key];
		const baseLine = [
			`${icon}${label}`,
			`${deltaSign}${delta}`,
			`(${valueRange})`,
		].join(' ');
		if (!source) {
			changes.push(baseLine);
			continue;
		}
		const sourceIcon = info?.icon || key;
		const resourceSummary = `${sourceIcon}${deltaSign}${delta}`;
		const sourceDetail = `${resourceSummary} from ${source}`;
		changes.push(`${baseLine} (${sourceDetail})`);
	}
	for (const key of Object.keys(after.stats)) {
		const beforeValue = before.stats[key] ?? 0;
		const afterValue = after.stats[key] ?? 0;
		if (afterValue !== beforeValue) {
			const info = STATS[key as StatLookupKey];
			const iconOnly = info?.icon || '';
			const icon = iconOnly ? `${iconOnly} ` : '';
			const label = info?.label ?? key;
			const delta = afterValue - beforeValue;
			const beforeStr = formatValue(key, beforeValue);
			const afterStr = formatValue(key, afterValue);
			const deltaStr = formatValue(key, delta);
			const deltaSign = delta >= 0 ? '+' : '';
			const valueRange = `${beforeStr}→${afterStr}`;
			let line = [
				`${icon}${label}`,
				`${deltaSign}${deltaStr}`,
				`(${valueRange})`,
			].join(' ');
			if (!displaysAsPercent(key)) {
				const breakdown = findStatPctBreakdown(step, key);
				if (breakdown && delta > 0) {
					const equation = buildGrowthEquation(
						breakdown,
						context,
						iconOnly,
						beforeStr,
						afterStr,
					);
					if (equation) {
						line += ` (${equation})`;
					}
				}
			}
			changes.push(line);
		}
	}
	appendStructureChanges(changes, before, after, context);
	return changes;
}
