import {
	PASSIVE_INFO,
	MODIFIER_INFO,
	formatPassiveRemoval,
} from '@kingdom-builder/contents';
import { type PassiveSummary, type EffectDef } from '@kingdom-builder/engine';
import {
	hasTierSummaryTranslation,
	translateTierSummary,
} from '../content/tierSummaries';

const MODIFIER_ICON_MAP = {
	cost_mod: MODIFIER_INFO.cost.icon,
	result_mod: MODIFIER_INFO.result.icon,
} as const;

type ModifierIconKey = keyof typeof MODIFIER_ICON_MAP;

function hasModifierIconKey(value: string): value is ModifierIconKey {
	return value in MODIFIER_ICON_MAP;
}

export interface PassiveDefinitionLike {
	detail?: string;
	meta?: PassiveSummary['meta'];
	effects?: EffectDef[];
}

export interface PassivePresentation {
	icon: string;
	label: string;
	summary?: string;
	removal?: string;
}

function normalizeLabel(value: string | undefined): string | undefined {
	if (!value) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function formatFallbackLabel(value: string): string {
	const spaced = value.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return value;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveSummaryToken(value: string | undefined): string | undefined {
	const token = normalizeLabel(value);
	if (!token) {
		return undefined;
	}
	if (!hasTierSummaryTranslation(token)) {
		return undefined;
	}
	return translateTierSummary(token) ?? token;
}

function describeRemoval(meta: PassiveSummary['meta']): string | undefined {
	const removalText = meta?.removal?.text;
	if (removalText && removalText.trim().length > 0) {
		return removalText;
	}
	const removalToken = meta?.removal?.token;
	if (removalToken && removalToken.trim().length > 0) {
		return formatPassiveRemoval(removalToken);
	}
	return undefined;
}

function formatSlug(value: string): string {
	return value
		.split(/[_-]/g)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function extractTokenSlug(value: string | undefined): string | undefined {
	const normalized = normalizeLabel(value);
	if (!normalized) {
		return undefined;
	}
	for (const delimiter of ['.', ':', '/']) {
		if (normalized.includes(delimiter)) {
			const slug = normalized.slice(normalized.lastIndexOf(delimiter) + 1);
			if (slug && slug !== normalized) {
				return formatSlug(slug);
			}
		}
	}
	return undefined;
}

function deriveIcon(
	passive: PassiveSummary,
	effects: EffectDef[] | undefined,
	meta: PassiveSummary['meta'] | undefined,
): string {
	if (meta?.source?.icon) {
		return meta.source.icon;
	}
	if (passive.icon) {
		return passive.icon;
	}
	const firstEffect = effects?.[0];
	const modifierType = firstEffect?.type;
	if (modifierType && hasModifierIconKey(modifierType)) {
		return MODIFIER_ICON_MAP[modifierType];
	}
	return PASSIVE_INFO.icon ?? '';
}

function resolveLabel(
	passive: PassiveSummary,
	definition: PassiveDefinitionLike,
	meta: PassiveSummary['meta'],
): string {
	const fallbackLabel = formatFallbackLabel(passive.id);
	const named =
		normalizeLabel(passive.name) ||
		normalizeLabel((meta?.source as { name?: string } | undefined)?.name);
	if (named) {
		return named;
	}
	const slug =
		extractTokenSlug(meta?.source?.labelToken) ||
		extractTokenSlug(meta?.source?.id) ||
		extractTokenSlug(passive.id) ||
		extractTokenSlug(definition.detail) ||
		extractTokenSlug(passive.detail);
	if (slug) {
		return slug;
	}
	const normalized =
		normalizeLabel(passive.detail) ||
		normalizeLabel(definition.detail) ||
		normalizeLabel(passive.id);
	const rawLabel = normalized || PASSIVE_INFO.label || fallbackLabel;
	return rawLabel === passive.id ? fallbackLabel : rawLabel;
}

function resolveSummary(
	definition: PassiveDefinitionLike,
	meta: PassiveSummary['meta'],
	passive: PassiveSummary,
): string | undefined {
	const candidates = [
		meta?.source?.labelToken,
		definition.detail,
		passive.detail,
	];
	for (const candidate of candidates) {
		const summary = resolveSummaryToken(candidate);
		if (summary) {
			return summary;
		}
	}
	for (const candidate of candidates) {
		const text = normalizeLabel(candidate);
		if (text) {
			return text;
		}
	}
	return undefined;
}

export function resolvePassivePresentation(
	passive: PassiveSummary,
	options: { definition?: PassiveDefinitionLike } = {},
): PassivePresentation {
	const definition = options.definition ?? {};
	const meta = definition.meta ?? passive.meta;
	const icon = deriveIcon(passive, definition.effects, meta);
	const label = resolveLabel(passive, definition, meta);
	const summary = resolveSummary(definition, meta, passive);
	const removal = meta ? describeRemoval(meta) : undefined;
	const presentation: PassivePresentation = { icon, label };
	if (summary) {
		presentation.summary = summary;
	}
	if (removal) {
		presentation.removal = removal;
	}
	return presentation;
}
