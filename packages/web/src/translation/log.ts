import {
	EVALUATORS,
	type EffectDef,
	type EngineContext,
	type PassiveSummary,
	type PlayerId,
} from '@kingdom-builder/engine';
import {
	RESOURCES,
	STATS,
	POPULATION_ROLES,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
	POPULATION_INFO,
	type ResourceKey,
} from '@kingdom-builder/contents';
import { formatStatValue, statDisplaysAsPercent } from '../utils/stats';
interface StepDef {
	id: string;
	title?: string;
	triggers?: string[];
	effects?: EffectDef[];
}
import { logContent, type Land } from './content';
import { resolveBuildingIcon } from './content/buildingIcons';

export interface PlayerSnapshot {
	resources: Record<string, number>;
	stats: Record<string, number>;
	buildings: string[];
	lands: {
		id: string;
		slotsMax: number;
		slotsUsed: number;
		developments: string[];
	}[];
	passives: PassiveSummary[];
}

export function snapshotPlayer(
	player: {
		id: string;
		resources: Record<string, number>;
		stats: Record<string, number>;
		buildings: Set<string>;
		lands: Land[];
	},
	ctx: EngineContext,
): PlayerSnapshot {
	return {
		resources: { ...player.resources },
		stats: { ...player.stats },
		buildings: Array.from(player.buildings ?? []),
		lands: player.lands.map((l) => ({
			id: l.id,
			slotsMax: l.slotsMax,
			slotsUsed: l.slotsUsed,
			developments: [...l.developments],
		})),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
		passives: ctx.passives.list(player.id as PlayerId),
	};
}

export function diffSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	ctx: EngineContext,
	resourceKeys: ResourceKey[] = Object.keys({
		...before.resources,
		...after.resources,
	}) as ResourceKey[],
): string[] {
	const changes: string[] = [];
	for (const key of resourceKeys) {
		const b = before.resources[key] ?? 0;
		const a = after.resources[key] ?? 0;
		if (a !== b) {
			const info = RESOURCES[key];
			const icon = info?.icon ? `${info.icon} ` : '';
			const label = info?.label ?? key;
			const delta = a - b;
			changes.push(
				`${icon}${label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a})`,
			);
		}
	}
	for (const key of Object.keys(after.stats)) {
		const b = before.stats[key] ?? 0;
		const a = after.stats[key] ?? 0;
		if (a !== b) {
			const info = STATS[key as keyof typeof STATS];
			const icon = info?.icon ? `${info.icon} ` : '';
			const label = info?.label ?? key;
			const delta = a - b;
			if (statDisplaysAsPercent(key)) {
				const bPerc = b * 100;
				const aPerc = a * 100;
				const dPerc = delta * 100;
				changes.push(
					`${icon}${label} ${dPerc >= 0 ? '+' : ''}${dPerc}% (${bPerc}→${aPerc}%)`,
				);
			} else {
				changes.push(
					`${icon}${label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a})`,
				);
			}
		}
	}
	const beforeB = new Set(before.buildings);
	const afterB = new Set(after.buildings);
	for (const id of afterB) {
		if (!beforeB.has(id)) {
			const label = logContent('building', id, ctx)[0] ?? id;
			changes.push(`${label} built`);
		}
	}
	for (const land of after.lands) {
		const prev = before.lands.find((l) => l.id === land.id);
		if (!prev) {
			changes.push(`${LAND_INFO.icon} +1 ${LAND_INFO.label}`);
			continue;
		}
		for (const dev of land.developments) {
			if (!prev.developments.includes(dev)) {
				const label = logContent('development', dev, ctx)[0] ?? dev;
				changes.push(`${LAND_INFO.icon} +${label}`);
			}
		}
	}
	const beforeSlots = before.lands.reduce((sum, l) => sum + l.slotsMax, 0);
	const afterSlots = after.lands.reduce((sum, l) => sum + l.slotsMax, 0);
	const newLandSlots = after.lands
		.filter((l) => !before.lands.some((b) => b.id === l.id))
		.reduce((sum, l) => sum + l.slotsMax, 0);
	const slotDelta = afterSlots - newLandSlots - beforeSlots;
	if (slotDelta !== 0) {
		changes.push(
			`${SLOT_INFO.icon} ${SLOT_INFO.label} ${slotDelta >= 0 ? '+' : ''}${slotDelta} (${beforeSlots}→${beforeSlots + slotDelta})`,
		);
	}
	const beforePassiveMap = new Map(before.passives.map((p) => [p.id, p]));
	const afterPassiveMap = new Map(after.passives.map((p) => [p.id, p]));
	for (const [id, passive] of afterPassiveMap) {
		if (beforePassiveMap.has(id)) {
			continue;
		}
		const { icon, label, removal } = resolvePassiveLogDetails(passive);
		const prefix = icon ? `${icon} ` : '';
		const suffix = removal ? ` (${removal})` : '';
		changes.push(`${prefix}${label} activated${suffix}`);
	}
	for (const [id, passive] of beforePassiveMap) {
		if (afterPassiveMap.has(id)) {
			continue;
		}
		const { icon, label } = resolvePassiveLogDetails(passive);
		const prefix = icon ? `${icon} ` : '';
		changes.push(`${prefix}${label} expired`);
	}
	return changes;
}

interface ResourceSourceEntry {
	icons: string;
	mods: string;
}

type PassiveDescriptor = {
	icon?: string;
	meta?: { source?: { icon?: string } };
};

type ResourceSourceMeta = Record<string, unknown> & {
	type?: string;
	id?: string;
	landId?: string;
	count?: number;
};

function isResourceSourceMeta(value: unknown): value is ResourceSourceMeta {
	return typeof value === 'object' && value !== null && 'type' in value;
}

export type EvaluatorIconRenderer = (
	ev: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	ctx: EngineContext,
) => void;

type MetaIconRenderer = (
	meta: ResourceSourceMeta,
	ctx: EngineContext,
) => string;

function evaluateCount(
	ev: { type: string; params?: Record<string, unknown> },
	ctx: EngineContext,
): number {
	const handler = EVALUATORS.get(ev.type);
	return Number(handler(ev, ctx));
}

function renderDevelopmentIcons(
	ev: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	ctx: EngineContext,
): void {
	const count = evaluateCount(ev, ctx);
	const id = (ev.params as Record<string, string> | undefined)?.['id'];
	const icon = id ? ctx.developments.get(id)?.icon || '' : '';
	entry.icons += icon.repeat(count);
}

function renderPopulationIcons(
	ev: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	ctx: EngineContext,
): void {
	const count = evaluateCount(ev, ctx);
	const role = (ev.params as Record<string, string> | undefined)?.['role'] as
		| keyof typeof POPULATION_ROLES
		| undefined;
	const icon = role
		? POPULATION_ROLES[role]?.icon || role
		: POPULATION_INFO.icon;
	entry.icons += icon.repeat(count);
}

export const EVALUATOR_ICON_RENDERERS: Record<string, EvaluatorIconRenderer> = {
	development: renderDevelopmentIcons,
	population: renderPopulationIcons,
};

function renderPopulationMetaIcons(
	meta: ResourceSourceMeta,
	_ctx: EngineContext,
): string {
	const role = meta.id as keyof typeof POPULATION_ROLES | undefined;
	const icon = role
		? POPULATION_ROLES[role]?.icon || role
		: POPULATION_INFO.icon;
	if (!icon) {
		return '';
	}
	if (meta.count === undefined) {
		return icon;
	}
	const rawCount = Number(meta.count);
	if (!Number.isFinite(rawCount)) {
		return icon;
	}
	const normalizedCount = rawCount > 0 ? Math.max(1, Math.round(rawCount)) : 0;
	if (normalizedCount === 0) {
		return '';
	}
	return icon.repeat(normalizedCount);
}

function renderDevelopmentMetaIcons(
	meta: ResourceSourceMeta,
	ctx: EngineContext,
): string {
	if (!meta.id) {
		return '';
	}
	return ctx.developments.get(meta.id)?.icon || '';
}

function renderBuildingMetaIcons(
	meta: ResourceSourceMeta,
	ctx: EngineContext,
): string {
	if (!meta.id) {
		return '';
	}
	return resolveBuildingIcon(meta.id, ctx);
}

function renderLandMetaIcons(): string {
	return LAND_INFO.icon || '';
}

const META_ICON_RENDERERS: Record<string, MetaIconRenderer> = {
	population: renderPopulationMetaIcons,
	development: renderDevelopmentMetaIcons,
	building: renderBuildingMetaIcons,
	land: renderLandMetaIcons,
};

function appendMetaSourceIcons(
	entry: ResourceSourceEntry,
	source: unknown,
	ctx: EngineContext,
) {
	if (!isResourceSourceMeta(source) || !source.type) {
		return;
	}
	const renderer = META_ICON_RENDERERS[source.type];
	if (!renderer) {
		return;
	}
	const icons = renderer(source, ctx);
	if (icons) {
		entry.icons += icons;
	}
}

function collectResourceSources(
	step: StepDef | undefined,
	ctx: EngineContext,
): Record<string, string> {
	const map: Record<string, ResourceSourceEntry> = {};
	for (const eff of step?.effects || []) {
		if (eff.evaluator && eff.effects) {
			const inner = eff.effects.find((e) => e.type === 'resource');
			if (!inner) {
				continue;
			}
			const key = inner.params?.['key'] as string | undefined;
			if (!key) {
				continue;
			}
			const entry = map[key] || { icons: '', mods: '' };
			const ev = eff.evaluator as {
				type: string;
				params?: Record<string, unknown>;
			};
			try {
				EVALUATOR_ICON_RENDERERS[ev.type]?.(ev, entry, ctx);
				const idParam = ev.params?.['id'];
				const target =
					ev.params && 'id' in ev.params
						? `${ev.type}:${String(idParam)}`
						: ev.type;
				type PassiveLookup = {
					evaluationMods?: Map<string, Map<string, unknown>>;
					get?: (id: string, owner: PlayerId) => PassiveDescriptor | undefined;
				};
				const passives = ctx.passives as unknown as PassiveLookup;
				const modsMap = passives.evaluationMods?.get(target);
				if (modsMap) {
					for (const key of modsMap.keys()) {
						if (!key.endsWith(`_${ctx.activePlayer.id}`)) {
							continue;
						}
						const base = key.replace(`_${ctx.activePlayer.id}`, '');
						const parts = base.split('_');
						let icon = '';
						for (let i = parts.length; i > 0; i--) {
							const candidate = parts.slice(0, i).join('_');
							icon = resolveBuildingIcon(candidate, ctx);
							if (icon) {
								break;
							}
						}
						if (!icon && passives.get) {
							const passive = passives.get(base, ctx.activePlayer.id);
							icon = passive?.icon || passive?.meta?.source?.icon || '';
						}
						if (!icon) {
							icon = PASSIVE_INFO.icon || '';
						}
						if (icon) {
							entry.mods += icon;
						}
					}
				}
			} catch {
				// ignore missing evaluators
			}
			map[key] = entry;
		}
		if (eff.type === 'resource') {
			const key = eff.params?.['key'] as string | undefined;
			if (!key) {
				continue;
			}
			const entry = map[key] || { icons: '', mods: '' };
			const meta = eff.meta?.['source'];
			appendMetaSourceIcons(entry, meta, ctx);
			map[key] = entry;
		}
	}
	const result: Record<string, string> = {};
	for (const [key, { icons, mods }] of Object.entries(map)) {
		let part = icons;
		if (mods) {
			part += `+${mods}`;
		}
		result[key] = part;
	}
	return result;
}

function findStatPctBreakdown(
	step: StepDef | undefined,
	statKey: string,
): { role: string; percentStat: string } | undefined {
	const walk = (
		effects: EffectDef[] | undefined,
		currentRole: string | undefined,
	): { role: string; percentStat: string } | undefined => {
		if (!effects) {
			return undefined;
		}
		for (const eff of effects) {
			let role = currentRole;
			if (eff.evaluator?.type === 'population') {
				role = (eff.evaluator.params as Record<string, string> | undefined)?.[
					'role'
				];
			}
			if (eff.type === 'stat' && eff.method === 'add_pct') {
				const params = eff.params as Record<string, string> | undefined;
				if (params?.['key'] === statKey && params?.['percentStat'] && role) {
					return { role, percentStat: params['percentStat'] };
				}
			}
			const nested = walk(eff.effects, role);
			if (nested) {
				return nested;
			}
		}
		return undefined;
	};
	return walk(step?.effects, undefined);
}

function resolvePassiveLogDetails(passive: PassiveSummary) {
	const icon =
		passive.meta?.source?.icon ?? passive.icon ?? PASSIVE_INFO.icon ?? '';
	const label =
		[passive.meta?.source?.labelToken, passive.detail, passive.name, passive.id]
			.map((candidate) => candidate?.trim())
			.find((candidate) => candidate && candidate.length > 0) ?? passive.id;
	let removal: string | undefined;
	const removalText = passive.meta?.removal?.text;
	if (removalText && removalText.trim().length > 0) {
		removal = removalText;
	} else {
		const removalToken = passive.meta?.removal?.token;
		if (removalToken && removalToken.trim().length > 0) {
			removal = `Removed when ${removalToken}`;
		}
	}
	return { icon, label, removal };
}

export function diffStepSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	step: StepDef | undefined,
	ctx: EngineContext,
	resourceKeys: ResourceKey[] = Object.keys({
		...before.resources,
		...after.resources,
	}) as ResourceKey[],
): string[] {
	const changes: string[] = [];
	const sources = collectResourceSources(step, ctx);
	for (const key of resourceKeys) {
		const b = before.resources[key] ?? 0;
		const a = after.resources[key] ?? 0;
		if (a !== b) {
			const info = RESOURCES[key];
			const icon = info?.icon ? `${info.icon} ` : '';
			const label = info?.label ?? key;
			const delta = a - b;
			let line = `${icon}${label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a})`;
			const src = sources[key];
			if (src) {
				line += ` (${info?.icon || key}${delta >= 0 ? '+' : ''}${delta} from ${src})`;
			}
			changes.push(line);
		}
	}
	for (const key of Object.keys(after.stats)) {
		const b = before.stats[key] ?? 0;
		const a = after.stats[key] ?? 0;
		if (a !== b) {
			const info = STATS[key as keyof typeof STATS];
			const iconOnly = info?.icon || '';
			const icon = iconOnly ? `${iconOnly} ` : '';
			const label = info?.label ?? key;
			const delta = a - b;
			const bStr = formatStatValue(key, b);
			const aStr = formatStatValue(key, a);
			const dStr = formatStatValue(key, delta);
			let line = `${icon}${label} ${delta >= 0 ? '+' : ''}${dStr} (${bStr}→${aStr})`;
			if (!statDisplaysAsPercent(key)) {
				const breakdown = findStatPctBreakdown(step, key);
				if (breakdown && delta > 0) {
					const role = breakdown.role as keyof typeof POPULATION_ROLES;
					const count = ctx.activePlayer.population[role] ?? 0;
					const popIcon = POPULATION_ROLES[role]?.icon || '';
					const pctStat = breakdown.percentStat as keyof typeof STATS;
					const growth = ctx.activePlayer.stats[pctStat] ?? 0;
					const growthIcon = STATS[pctStat]?.icon || '';
					const growthStr = formatStatValue(breakdown.percentStat, growth);
					line += ` (${iconOnly}${bStr} + (${popIcon}${count} * ${growthIcon}${growthStr}) = ${iconOnly}${aStr})`;
				}
			}
			changes.push(line);
		}
	}
	const beforeB = new Set(before.buildings);
	const afterB = new Set(after.buildings);
	for (const id of afterB) {
		if (!beforeB.has(id)) {
			const label = logContent('building', id, ctx)[0] ?? id;
			changes.push(`${label} built`);
		}
	}
	for (const land of after.lands) {
		const prev = before.lands.find((l) => l.id === land.id);
		if (!prev) {
			changes.push(`${LAND_INFO.icon} +1 ${LAND_INFO.label}`);
			continue;
		}
		for (const dev of land.developments) {
			if (!prev.developments.includes(dev)) {
				const label = logContent('development', dev, ctx)[0] ?? dev;
				changes.push(`${LAND_INFO.icon} +${label}`);
			}
		}
	}
	const beforeSlots = before.lands.reduce((sum, l) => sum + l.slotsMax, 0);
	const afterSlots = after.lands.reduce((sum, l) => sum + l.slotsMax, 0);
	const newLandSlots = after.lands
		.filter((l) => !before.lands.some((b) => b.id === l.id))
		.reduce((sum, l) => sum + l.slotsMax, 0);
	const slotDelta = afterSlots - newLandSlots - beforeSlots;
	if (slotDelta !== 0) {
		changes.push(
			`${SLOT_INFO.icon} ${SLOT_INFO.label} ${slotDelta >= 0 ? '+' : ''}${slotDelta} (${beforeSlots}→${beforeSlots + slotDelta})`,
		);
	}
	const beforePassiveMap = new Map(before.passives.map((p) => [p.id, p]));
	const afterPassiveMap = new Map(after.passives.map((p) => [p.id, p]));
	for (const [id, passive] of afterPassiveMap) {
		if (beforePassiveMap.has(id)) {
			continue;
		}
		const { icon, label, removal } = resolvePassiveLogDetails(passive);
		const prefix = icon ? `${icon} ` : '';
		const suffix = removal ? ` (${removal})` : '';
		changes.push(`${prefix}${label} activated${suffix}`);
	}
	for (const [id, passive] of beforePassiveMap) {
		if (afterPassiveMap.has(id)) {
			continue;
		}
		const { icon, label } = resolvePassiveLogDetails(passive);
		const prefix = icon ? `${icon} ` : '';
		changes.push(`${prefix}${label} expired`);
	}
	return changes;
}
