import type { EffectDef } from '@kingdom-builder/protocol';
import { RESOURCES } from '@kingdom-builder/contents';
import { GENERAL_RESOURCE_ICON, GENERAL_RESOURCE_LABEL } from '../../../icons';
import type { DevelopmentDef, ResourceKey } from '@kingdom-builder/contents';
import { signed } from '../helpers';
import type { SummaryEntry } from '../../content/types';
import type { TranslationContext } from '../../context';

const joinParts = (...parts: Array<string | undefined>) =>
	parts.filter(Boolean).join(' ').trim();

const GENERAL_RESOURCES_KEYWORD = `${GENERAL_RESOURCE_ICON} ${GENERAL_RESOURCE_LABEL}`;

export const RESULT_EVENT_GRANT_RESOURCES = `Whenever it grants ${GENERAL_RESOURCES_KEYWORD}`,
	RESULT_EVENT_RESOLVE = 'Whenever it resolves',
	RESULT_EVENT_TRANSFER = `Whenever it transfers ${GENERAL_RESOURCES_KEYWORD}`;

export const formatTargetLabel = (icon: string, name: string) =>
	joinParts(icon, name || '');

export function formatResultModifierClause(
	label: string,
	target: string,
	event: string,
	effect: string,
): string {
	const prefix = `${label} on ${target}: ${event}`;
	return `${prefix}, ${effect}`;
}

interface ResultModifierWrapTarget {
	icon?: string;
	name: string;
}

interface ResultModifierWrapOptions {
	mode: 'summary' | 'describe';
	contextIcon?: string;
}

export function wrapResultModifierEntries(
	label: ResultModifierLabel,
	entries: SummaryEntry[],
	target: ResultModifierWrapTarget,
	event: string,
	options: ResultModifierWrapOptions,
): SummaryEntry[] {
	if (!entries.length) {
		return [];
	}
	if (options.mode === 'summary') {
		const targetIcon =
			target.icon && target.icon.trim() ? target.icon : target.name;
		const prefix = `${label.icon}${targetIcon}${
			options.contextIcon ? `(${options.contextIcon})` : ''
		}:`;
		return entries.map((entry) =>
			typeof entry === 'string'
				? `${prefix} ${entry}`
				: {
						...entry,
						title: `${prefix} ${entry.title}`,
					},
		);
	}
	const labelText = `${label.icon} ${label.label}`;
	const targetLabel = formatTargetLabel(target.icon ?? '', target.name);
	const prefix = `${labelText} on ${targetLabel}: ${event}`;
	return entries.map((entry) =>
		typeof entry === 'string'
			? `${prefix}, ${entry}`
			: {
					...entry,
					title: `${prefix}, ${entry.title}`,
				},
	);
}

export interface ResultModifierLabel {
	icon: string;
	label: string;
}

interface ResultModifierSource {
	summaryTargetIcon: string;
	summaryContextIcon?: string;
	description: string;
}

const resolveIcon = (icon?: string) =>
	icon && icon.trim() ? icon : GENERAL_RESOURCE_ICON;

export const formatPercentText = (percent: number) => {
	const scaled = Number((percent * 100).toFixed(2));
	const normalized = Object.is(scaled, -0) ? 0 : scaled;
	const sign = percent >= 0 ? '+' : '';
	return `${sign}${normalized}%`;
};

export const formatPercentMagnitude = (percent: number) => {
	const scaled = Number((Math.abs(percent) * 100).toFixed(2));
	return Object.is(scaled, -0) ? 0 : scaled;
};

export const parseNumericParam = (value: unknown) => {
	if (typeof value === 'number') {
		return Number.isNaN(value) ? undefined : value;
	}
	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		return Number.isNaN(parsed) ? undefined : parsed;
	}
	return undefined;
};

export function formatGainFrom(
	label: ResultModifierLabel,
	source: ResultModifierSource,
	amount: number,
	options: {
		key?: string;
		detailed?: boolean;
		percent?: number;
		round?: 'up' | 'down';
	} = {},
) {
	const { key, detailed, percent, round } = options;
	const resourceInfo = key ? RESOURCES[key as ResourceKey] : undefined;
	const resIcon = resourceInfo?.icon || key;
	const usePercent = typeof percent === 'number' && !Number.isNaN(percent);
	const value = usePercent ? Number(percent) : amount;
	const normalizedValue = Object.is(value, -0) ? 0 : value;
	const amountText = usePercent
		? formatPercentText(normalizedValue)
		: `${signed(normalizedValue)}${normalizedValue}`;
	const roundingDetail =
		usePercent && round ? ` (rounded ${round === 'down' ? 'down' : 'up'})` : '';

	if (!detailed) {
		const context = source.summaryContextIcon
			? `(${source.summaryContextIcon})`
			: '';
		const prefix = `${label.icon}${source.summaryTargetIcon}${context}:`;
		if (usePercent) {
			const magnitude = formatPercentMagnitude(normalizedValue);
			const adjective = normalizedValue >= 0 ? 'more' : 'less';
			const percentSummary = joinParts('gain', `${magnitude}%`, adjective);
			const decoratedPercentSummary = `${percentSummary}${roundingDetail}`;
			return `${prefix} ${decoratedPercentSummary}`;
		}
		const icon = resolveIcon(resIcon);
		const valueText = icon ? `${icon}${amountText}` : amountText;
		return `${prefix} ${valueText}`;
	}

	const more = (() => {
		if (!usePercent) {
			const moreIcon = resolveIcon(resIcon);
			const moreValue = moreIcon ? `${moreIcon}${amountText}` : amountText;
			return `${moreValue} more${detailed ? ' of that resource' : ''}`;
		}
		const magnitude = formatPercentMagnitude(normalizedValue);
		const adjective = normalizedValue >= 0 ? 'more' : 'less';
		return `${magnitude}% ${adjective}${detailed ? ' of that resource' : ''}`;
	})();
	return formatResultModifierClause(
		`${label.icon} ${label.label}`,
		source.description,
		RESULT_EVENT_GRANT_RESOURCES,
		`gain ${more}${usePercent ? roundingDetail : ''}`,
	);
}

export function formatDevelopment(
	label: ResultModifierLabel,
	effectDefinition: EffectDef,
	evaluation: { id: string },
	translationContext: TranslationContext,
	detailed: boolean,
) {
	const { icon, name } = getDevelopmentInfo(translationContext, evaluation.id);
	const fallbackLabelFromId = () => {
		const rawId = effectDefinition.params?.['id'];
		if (typeof rawId !== 'string' || rawId.trim().length === 0) {
			return undefined;
		}
		const slug = rawId.split(':').pop();
		if (!slug) {
			return undefined;
		}
		return slug
			.split(/[-_]/)
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	};
	const fallback = fallbackLabelFromId() ?? 'Income';
	const target = formatTargetLabel(icon, name) || fallback;
	const summaryTargetIcon = icon?.trim()
		? icon
		: name?.trim()
			? name
			: fallback;
	const source = {
		summaryTargetIcon,
		description: target,
	};
	const resourceEffect = effectDefinition.effects?.find(
		(
			nestedEffect,
		): nestedEffect is EffectDef<{ key: string; amount: number }> =>
			nestedEffect.type === 'resource' &&
			(nestedEffect.method === 'add' || nestedEffect.method === 'remove'),
	);
	if (resourceEffect) {
		const key = resourceEffect.params?.['key'] as string;
		const rawAmount = Number(resourceEffect.params?.['amount']);
		const amount = resourceEffect.method === 'remove' ? -rawAmount : rawAmount;
		return formatGainFrom(label, source, amount, { key, detailed });
	}
	const percentParam = effectDefinition.params?.['percent'];
	if (percentParam !== undefined) {
		const percent = Number(percentParam);
		const round =
			effectDefinition.round === 'down' || effectDefinition.round === 'up'
				? effectDefinition.round
				: undefined;
		return formatGainFrom(label, source, percent, {
			detailed,
			percent,
			...(round ? { round } : {}),
		});
	}
	const amount = Number(effectDefinition.params?.['amount'] ?? 0);
	return formatGainFrom(label, source, amount, { detailed });
}

export function getDevelopmentInfo(
	translationContext: TranslationContext,
	id: string,
) {
	try {
		const developmentDefinition: DevelopmentDef =
			translationContext.developments.get(id);
		return {
			icon: developmentDefinition.icon ?? '',
			name: developmentDefinition.name ?? id,
		};
	} catch {
		return { icon: '', name: id };
	}
}
