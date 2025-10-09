import { resolveBuildingIcon } from '../../content/buildingIcons';
import { type TranslationDiffContext } from './context';
import { type ResourceSourceEntry } from './types';

export type ResourceSourceMeta = Record<string, unknown> & {
	type?: string;
	id?: string;
	landId?: string;
	count?: number;
};

type MetaIconRenderer = (
	meta: ResourceSourceMeta,
	context: TranslationDiffContext,
) => string;

function isResourceSourceMeta(value: unknown): value is ResourceSourceMeta {
	return typeof value === 'object' && value !== null && 'type' in value;
}

function normalizeMetaCount(rawCount: number): number {
	if (rawCount <= 0) {
		return 0;
	}
	const rounded = Math.round(rawCount);
	return Math.max(1, rounded);
}

function renderPopulationMetaIcons(
        meta: ResourceSourceMeta,
        context: TranslationDiffContext,
): string {
        const role = meta.id as string | undefined;
        const definition = role && context.populations.has(role)
                ? context.populations.get(role)
                : undefined;
        const icon = definition?.icon || context.info.population.icon || role;
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
	const normalizedCount = normalizeMetaCount(rawCount);
	if (normalizedCount === 0) {
		return '';
	}
	return icon.repeat(normalizedCount);
}

function renderDevelopmentMetaIcons(
	meta: ResourceSourceMeta,
	context: TranslationDiffContext,
): string {
	if (!meta.id) {
		return '';
	}
	return context.developments.get(meta.id)?.icon || '';
}

function renderBuildingMetaIcons(
	meta: ResourceSourceMeta,
	context: TranslationDiffContext,
): string {
	if (!meta.id) {
		return '';
	}
	return resolveBuildingIcon(meta.id, context);
}

function renderLandMetaIcons(
        _meta: ResourceSourceMeta,
        context: TranslationDiffContext,
): string {
        return context.info.land.icon || '';
}

const META_ICON_RENDERERS: Record<string, MetaIconRenderer> = {
        population: renderPopulationMetaIcons,
        development: renderDevelopmentMetaIcons,
        building: renderBuildingMetaIcons,
        land: renderLandMetaIcons,
};

export function appendMetaSourceIcons(
	entry: ResourceSourceEntry,
	source: unknown,
	context: TranslationDiffContext,
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
