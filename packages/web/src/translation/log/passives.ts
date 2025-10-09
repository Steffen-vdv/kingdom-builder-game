import { type EffectDef, type SessionPassiveSummary } from '@kingdom-builder/protocol';
import {
	hasTierSummaryTranslation,
	translateTierSummary,
} from '../content/tierSummaries';
import {
        DEFAULT_LAND_INFO,
        DEFAULT_MODIFIER_INFO,
        DEFAULT_PASSIVE_INFO,
        DEFAULT_POPULATION_INFO,
        DEFAULT_SLOT_INFO,
        type TranslationInfo,
} from '../context/defaultInfo';

function formatPassiveRemoval(description: string): string {
	return `Active as long as ${description}`;
}

function resolveModifierIcon(
	modifierType: string,
	info: TranslationInfo,
): string {
	if (modifierType === 'cost_mod') {
		return info.modifier.cost.icon ?? DEFAULT_MODIFIER_INFO.cost.icon;
	}
	if (modifierType === 'result_mod') {
		return info.modifier.result.icon ?? DEFAULT_MODIFIER_INFO.result.icon;
	}
	return '';
}

export interface PassiveDefinitionLike {
	detail?: string;
	meta?: SessionPassiveSummary['meta'];
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
	return spaced.replace(/\w/g, (char) => char.toUpperCase());
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

function describeRemoval(meta: SessionPassiveSummary['meta']): string | undefined {
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
	passive: SessionPassiveSummary,
	effects: EffectDef[] | undefined,
	meta: SessionPassiveSummary['meta'] | undefined,
	info: TranslationInfo,
): string {
	if (meta?.source?.icon) {
		return meta.source.icon;
	}
	if (passive.icon) {
		return passive.icon;
	}
	const firstEffect = effects?.[0];
	const modifierType = firstEffect?.type;
	if (modifierType) {
		const icon = resolveModifierIcon(modifierType, info);
		if (icon) {
			return icon;
		}
	}
	return info.passive.icon ?? DEFAULT_PASSIVE_INFO.icon ?? '';
}

function resolveLabel(
	passive: SessionPassiveSummary,
	definition: PassiveDefinitionLike,
	meta: SessionPassiveSummary['meta'],
	info: TranslationInfo,
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
	const rawLabel = normalized || info.passive.label || fallbackLabel;
	return rawLabel === passive.id ? fallbackLabel : rawLabel;
}

function resolveSummary(
	definition: PassiveDefinitionLike,
	meta: SessionPassiveSummary['meta'],
	passive: SessionPassiveSummary,
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
        passive: SessionPassiveSummary,
        options: { definition?: PassiveDefinitionLike; info?: TranslationInfo } = {},
): PassivePresentation {
        const info = options.info ?? {
                population: DEFAULT_POPULATION_INFO,
                passive: DEFAULT_PASSIVE_INFO,
                land: DEFAULT_LAND_INFO,
                slot: DEFAULT_SLOT_INFO,
                modifier: DEFAULT_MODIFIER_INFO,
        } as TranslationInfo;
	const definition = options.definition ?? {};
	const meta = definition.meta ?? passive.meta;
	const icon = deriveIcon(passive, definition.effects, meta, info);
	const label = resolveLabel(passive, definition, meta, info);
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
