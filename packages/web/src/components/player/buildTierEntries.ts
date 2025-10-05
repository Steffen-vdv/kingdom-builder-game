import { PASSIVE_INFO } from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { summarizeContent, splitSummary } from '../../translation';
import type { SummaryGroup } from '../../translation/content';

export const MAX_TIER_SUMMARY_LINES = 4;

export type TierDefinition =
	EngineContext['services']['rules']['tierDefinitions'][number];

type TierSummaryEntry = TierDefinition & { active: boolean };

type TierSummaryGroup = SummaryGroup & { className?: string };

export interface TierEntriesResult {
	entries: TierSummaryGroup[];
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
		if (min >= 0) {
			return `${min}+`;
		}
		return `≤ ${min}`;
	}
	if (min === max) {
		return `${min}`;
	}
	return `${min} to ${max}`;
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

function formatTierName(value: string | undefined) {
	const slug = extractTierSlug(value);
	if (!slug) {
		return 'Tier';
	}
	return slug
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
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
	const entries: TierSummaryEntry[] = orderedTiers.map((tier) => ({
		...tier,
		active: tier.id === activeId,
	}));
	const summaries = entries.map((entry) => {
		const { display, active } = entry;
		const rangeLabel = formatTierRange(entry);
		const icon = display?.icon ?? PASSIVE_INFO.icon ?? '';
		const labelToken = display?.summaryToken ?? entry.text?.summary;
		const name = formatTierName(labelToken ?? entry.id);
		const formattedRange = rangeLabel.length ? `(${rangeLabel})` : undefined;
		const titleParts = [icon, name, formattedRange].filter(
			(part) => part && String(part).trim().length > 0,
		);
		const title = titleParts.join(' ').trim();

		const summary = summarizeContent('tier', entry, ctx);
		const { effects } = splitSummary(summary);
		const items = effects.slice(0, MAX_TIER_SUMMARY_LINES);
		const group: TierSummaryGroup = { title, items };
		if (active) {
			group.className = 'text-emerald-600 dark:text-emerald-300';
		}
		return {
			entry: group,
			active,
			icon,
			name,
			rangeLabel,
		};
	});
	const activeEntry = summaries.find((entry) => entry.active);
	const result: TierEntriesResult = {
		entries: summaries.map((entry) => entry.entry),
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
