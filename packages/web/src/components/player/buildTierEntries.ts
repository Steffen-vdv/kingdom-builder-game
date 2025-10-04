import { PASSIVE_INFO } from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { summarizeEffects, translateTierSummary } from '../../translation';

export type TierDefinition =
	EngineContext['services']['rules']['tierDefinitions'][number];

type TierSummaryEntry = TierDefinition & { active: boolean };

const MAX_SUMMARY_LINES = 4;

function formatTierRange(tier: TierDefinition) {
	const { min, max } = tier.range;
	if (max === undefined) {
		return `${min}`;
	}
	if (min === max) {
		return `${min}`;
	}
	return `${min} to ${max}`;
}

function splitSummary(summary?: string) {
	if (!summary) {
		return [] as string[];
	}
	return summary
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function normalizeLine(line: string) {
	const trimmed = line.trim();
	if (!trimmed) {
		return trimmed;
	}
	return trimmed.replace(/^[-•–]\s*/u, '').trim();
}

function appendUnique(target: string[], values: string[]) {
	values.forEach((value) => {
		if (value && !target.includes(value)) {
			target.push(value);
		}
	});
}

function collectSummaryLines(
	entries: ReturnType<typeof summarizeEffects>,
	limit: number,
) {
	if (limit <= 0) {
		return [] as string[];
	}
	const lines: string[] = [];
	const queue = [...entries];
	while (queue.length && lines.length < limit) {
		const entry = queue.shift();
		if (entry === undefined) {
			continue;
		}
		if (typeof entry === 'string') {
			const segments = entry
				.split(/\r?\n/)
				.map((segment) => segment.trim())
				.filter((segment) => segment.length > 0);
			appendUnique(lines, segments);
			continue;
		}
		const title = entry.title.trim();
		if (title && !lines.includes(title)) {
			lines.push(title);
		}
		if (lines.length >= limit) {
			break;
		}
		if (entry.items?.length) {
			queue.unshift(...entry.items);
		}
	}
	return lines;
}

export function buildTierEntries(
	tiers: TierDefinition[],
	activeId: string | undefined,
	ctx: EngineContext,
) {
	const getRangeStart = (tier: TierDefinition) =>
		tier.range.min ?? Number.NEGATIVE_INFINITY;
	const orderedTiers = [...tiers].sort(
		(a, b) => getRangeStart(b) - getRangeStart(a),
	);
	const entries: TierSummaryEntry[] = orderedTiers.map((tier) => ({
		...tier,
		active: tier.id === activeId,
	}));
	return entries.map((entry) => {
		const { preview, display, text, active } = entry;
		const rangeLabel = formatTierRange(entry);
		const statusIcon = active ? '🟢' : '⚪';
		const icon = display?.icon ?? PASSIVE_INFO.icon ?? '';
		const titleParts = [statusIcon, icon, rangeLabel].filter(
			(part) => part && String(part).trim().length > 0,
		);
		const title = titleParts.join(' ').trim();

		const summaryToken = display?.summaryToken;
		const items: string[] = [];
		const translatedSummary = translateTierSummary(summaryToken);
		const summaryLines = splitSummary(translatedSummary ?? text?.summary);
		if (summaryLines.length > 0) {
			const normalized = summaryLines.map(normalizeLine);
			appendUnique(items, normalized);
		}

		if (!items.length && text?.summary) {
			const summaryLine = normalizeLine(text.summary);
			appendUnique(items, [summaryLine]);
		}
		if (!items.length) {
			const slots = MAX_SUMMARY_LINES - items.length;
			if (slots > 0) {
				const effectArgs = preview?.effects || [];
				const summaries = summarizeEffects(effectArgs, ctx);
				const lines = collectSummaryLines(summaries, slots);
				const normalized = lines.map(normalizeLine);
				appendUnique(items, normalized);
			}
		}

		if (!items.length) {
			items.push('No effect');
		}

		return { title, items };
	});
}
