import {
	PASSIVE_INFO,
	RESOURCES,
	type ResourceKey,
} from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { describeEffects, splitSummary } from '../../translation';
import type { SummaryEntry, SummaryGroup } from '../../translation/content';

export const MAX_TIER_SUMMARY_LINES = 4;

export type TierDefinition =
	EngineContext['services']['rules']['tierDefinitions'][number];

export interface TierSummary {
	entry: TierSummaryGroup;
	active: boolean;
	icon: string;
	name: string;
	rangeLabel: string;
}

type TierSummaryEntry = TierDefinition & { active: boolean };

type TierSummaryGroup = SummaryGroup & { className?: string };

export interface TierEntriesResult {
	entries: TierSummaryGroup[];
	summaries: TierSummary[];
	activeEntry?: {
		entry: TierSummaryGroup;
		icon: string;
		name: string;
		rangeLabel: string;
	};
}

function formatTierRange(tier: TierDefinition) {
	const { min, max } = tier.range;
	if (max === undefined) {
		return `${min}+`;
	}
	if (min === max) {
		return `${min}`;
	}
	return `${min} - ${max}`;
}

function extractTierSlug(value: string | undefined) {
	if (!value) {
		return undefined;
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return undefined;
	}
	for (const delimiter of ['.', ':', '/']) {
		if (trimmed.includes(delimiter)) {
			const slug = trimmed.slice(trimmed.lastIndexOf(delimiter) + 1);
			if (slug && slug !== trimmed) {
				return slug;
			}
		}
	}
	return trimmed;
}

function formatSlug(value: string) {
	return value
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function tryFormatTierName(value: string | undefined) {
	const slug = extractTierSlug(value);
	if (!slug) {
		return undefined;
	}
	return formatSlug(slug);
}

function resolveTierName(tier: TierDefinition) {
	const displayTitle = tier.display?.title?.trim();
	if (displayTitle) {
		return displayTitle;
	}
	return (
		tryFormatTierName(tier.display?.summaryToken) ??
		tryFormatTierName(tier.preview?.id) ??
		tryFormatTierName(tier.id) ??
		'Tier'
	);
}

function normalizeSummary(summary: string | undefined): SummaryEntry[] {
	if (!summary) {
		return [];
	}
	return summary
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

export function buildTierEntries(
	tiers: TierDefinition[],
	activeId: string | undefined,
	ctx: EngineContext,
): TierEntriesResult {
	const getRangeStart = (tier: TierDefinition) =>
		tier.range.min ?? Number.NEGATIVE_INFINITY;
	const orderedTiers = [...tiers].sort(
		(a, b) => getRangeStart(b) - getRangeStart(a),
	);
	const tierResourceKey = ctx.services.tieredResource?.resourceKey as
		| ResourceKey
		| undefined;
	const tierResourceIcon = tierResourceKey
		? RESOURCES[tierResourceKey]?.icon || ''
		: '';
	const entries: TierSummaryEntry[] = orderedTiers.map((tier) => ({
		...tier,
		active: tier.id === activeId,
	}));
	const summaries = entries.map((entry) => {
		const { display, active } = entry;
		const icon = display?.icon ?? PASSIVE_INFO.icon ?? '';
		const name = resolveTierName(entry);
		const titleParts = [icon, name].filter(
			(part) => part && String(part).trim().length > 0,
		);
		const baseTitle = titleParts.join(' ').trim();
		const rangeLabel = formatTierRange(entry);
		const rangeDisplay = rangeLabel.length
			? [tierResourceIcon, rangeLabel]
					.filter((part) => part && String(part).trim().length > 0)
					.join(' ')
			: '';
		const title = rangeDisplay ? `${baseTitle} (${rangeDisplay})` : baseTitle;

		let summaryEntries: SummaryEntry[] = [];
		if (entry.preview?.effects?.length) {
			summaryEntries = describeEffects(entry.preview.effects, ctx);
		}
		if (!summaryEntries.length) {
			summaryEntries = normalizeSummary(entry.text?.summary);
		}
		if (!summaryEntries.length) {
			summaryEntries = ['No effect'];
		}
		const { effects } = splitSummary(summaryEntries);
		const items = effects.slice(0, MAX_TIER_SUMMARY_LINES);
		if (items.length === 0) {
			items.push('No effect');
		}
		const group: TierSummaryGroup = { title, items };
		if (active) {
			group.className = 'text-emerald-600 dark:text-emerald-300';
		}
		const summary: TierSummary = {
			entry: group,
			active,
			icon,
			name,
			rangeLabel,
		};
		return summary;
	});
	const activeEntry = summaries.find((entry) => entry.active);
	const result: TierEntriesResult = {
		entries: summaries.map((entry) => entry.entry),
		summaries,
	};
	if (activeEntry) {
		result.activeEntry = {
			entry: activeEntry.entry,
			icon: activeEntry.icon,
			name: activeEntry.name,
			rangeLabel: activeEntry.rangeLabel,
		};
	}
	return result;
}
