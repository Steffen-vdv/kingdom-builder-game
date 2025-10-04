import {
	EVALUATORS,
	type EffectDef,
	type EngineContext,
} from '@kingdom-builder/engine';
import {
	LAND_INFO,
	POPULATION_INFO,
	POPULATION_ROLES,
} from '@kingdom-builder/contents';

import { resolveBuildingIcon } from '../content/buildingIcons';
import { appendPassiveIcons } from './metaPassiveIcons';

export interface StepDef {
	id: string;
	title?: string;
	triggers?: string[];
	effects?: EffectDef[];
}

export type ResourceSourceEntry = { icons: string; mods: string };
export type ResourceSourceMeta = Record<string, unknown> & {
	type?: string;
	id?: string;
	landId?: string;
	count?: number;
};

export function isResourceSourceMeta(
	value: unknown,
): value is ResourceSourceMeta {
	return typeof value === 'object' && value !== null && 'type' in value;
}

export type EvaluatorIconRenderer = (
	evaluator: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	context: EngineContext,
) => void;

type MetaIconRenderer = (
	meta: ResourceSourceMeta,
	context: EngineContext,
) => string;

function evaluateCount(
	evaluator: { type: string; params?: Record<string, unknown> },
	context: EngineContext,
): number {
	const handler = EVALUATORS.get(evaluator.type);
	return Number(handler(evaluator, context));
}

function renderDevelopmentIcons(
	evaluator: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	context: EngineContext,
): void {
	const count = evaluateCount(evaluator, context);
	const params = evaluator.params as Record<string, string> | undefined;
	const id = params?.['id'];
	const icon = id ? (context.developments.get(id)?.icon ?? '') : '';
	entry.icons += icon.repeat(count);
}

function renderPopulationIcons(
	evaluator: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	context: EngineContext,
): void {
	const count = evaluateCount(evaluator, context);
	const role = (evaluator.params as Record<string, string> | undefined)?.[
		'role'
	] as keyof typeof POPULATION_ROLES | undefined;
	const icon = role
		? POPULATION_ROLES[role]?.icon || role
		: POPULATION_INFO.icon;
	entry.icons += icon.repeat(count);
}

function normalizeCount(rawCount: number): number {
	if (rawCount <= 0) {
		return 0;
	}
	return Math.max(1, Math.round(rawCount));
}

export const EVALUATOR_ICON_RENDERERS: Record<string, EvaluatorIconRenderer> = {
	development: renderDevelopmentIcons,
	population: renderPopulationIcons,
};

function renderPopulationMetaIcons(
	meta: ResourceSourceMeta,
	_context: EngineContext,
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
	const normalizedCount = normalizeCount(rawCount);
	if (normalizedCount === 0) {
		return '';
	}
	return icon.repeat(normalizedCount);
}

function renderDevelopmentMetaIcons(
	meta: ResourceSourceMeta,
	context: EngineContext,
): string {
	if (!meta.id) {
		return '';
	}
	return context.developments.get(meta.id)?.icon || '';
}

function renderBuildingMetaIcons(
	meta: ResourceSourceMeta,
	context: EngineContext,
): string {
	if (!meta.id) {
		return '';
	}
	return resolveBuildingIcon(meta.id, context);
}

const renderLandMetaIcons = (): string => LAND_INFO.icon || '';

const META_ICON_RENDERERS: Record<string, MetaIconRenderer> = {
	population: renderPopulationMetaIcons,
	development: renderDevelopmentMetaIcons,
	building: renderBuildingMetaIcons,
	land: renderLandMetaIcons,
};

function appendMetaSourceIcons(
	entry: ResourceSourceEntry,
	source: unknown,
	context: EngineContext,
) {
	if (!isResourceSourceMeta(source) || !source.type) {
		return;
	}
	const renderer = META_ICON_RENDERERS[source.type];
	if (!renderer) {
		return;
	}
	const icons = renderer(source, context);
	if (icons) {
		entry.icons += icons;
	}
}

export function collectResourceSources(
	step: StepDef | undefined,
	context: EngineContext,
): Record<string, string> {
	const map: Record<string, ResourceSourceEntry> = {};
	for (const effect of step?.effects || []) {
		if (effect.evaluator && effect.effects) {
			const inner = effect.effects.find(
				(innerEffect) => innerEffect.type === 'resource',
			);
			if (!inner) {
				continue;
			}
			const rawKey = inner.params?.['key'];
			if (typeof rawKey !== 'string') {
				continue;
			}
			const entry = map[rawKey] || { icons: '', mods: '' };
			const evaluator = effect.evaluator as {
				type: string;
				params?: Record<string, unknown>;
			};
			try {
				const renderer = EVALUATOR_ICON_RENDERERS[evaluator.type];
				renderer?.(evaluator, entry, context);
				const idParam = evaluator.params?.['id'];
				const hasIdParam = Boolean(
					evaluator.params && 'id' in evaluator.params,
				);
				const target = hasIdParam
					? `${evaluator.type}:${String(idParam)}`
					: evaluator.type;
				appendPassiveIcons(entry, target, context);
			} catch {
				// ignore missing evaluators
			}
			map[rawKey] = entry;
		}
		if (effect.type === 'resource') {
			const rawKey = effect.params?.['key'];
			if (typeof rawKey !== 'string') {
				continue;
			}
			const entry = map[rawKey] || { icons: '', mods: '' };
			const meta = effect.meta?.['source'];
			appendMetaSourceIcons(entry, meta, context);
			map[rawKey] = entry;
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
