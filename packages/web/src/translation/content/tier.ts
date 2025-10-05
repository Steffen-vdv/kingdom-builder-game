import { formatPassiveRemoval } from '@kingdom-builder/contents';
import type { HappinessTierDefinition } from '@kingdom-builder/engine/services';
import type { EngineContext } from '@kingdom-builder/engine';
import { summarizeEffects } from '../effects';
import { translateTierSummary } from './tierSummaries';
import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary, SummaryEntry } from './types';

function splitLines(text: string | undefined): string[] {
	if (!text) {
		return [];
	}
	return text
		.split(/\r?\n/u)
		.map((line) => line.replace(/^[-•–]\s*/u, '').trim())
		.filter((line) => line.length > 0);
}

function appendUnique(target: string[], values: string[]): void {
	for (const value of values) {
		if (!value) {
			continue;
		}
		if (target.includes(value)) {
			continue;
		}
		target.push(value);
	}
}

function flattenSummary(entries: Summary): string[] {
	const lines: string[] = [];
	const queue: SummaryEntry[] = [...entries];
	while (queue.length) {
		const entry = queue.shift();
		if (entry === undefined) {
			continue;
		}
		if (typeof entry === 'string') {
			const trimmed = entry.trim();
			if (trimmed.length && !lines.includes(trimmed)) {
				lines.push(trimmed);
			}
			continue;
		}
		const title = entry.title.trim();
		if (title.length && !lines.includes(title)) {
			lines.push(title);
		}
		if (entry.items?.length) {
			queue.unshift(...entry.items);
		}
	}
	return lines;
}

class TierTranslator
	implements ContentTranslator<HappinessTierDefinition, Record<string, never>>
{
	summarize(tier: HappinessTierDefinition, ctx: EngineContext): Summary {
		const summaryLines: string[] = [];
		const translated = translateTierSummary(tier.display?.summaryToken);
		appendUnique(summaryLines, splitLines(translated ?? tier.text?.summary));
		if (!summaryLines.length && tier.preview?.effects?.length) {
			const effectSummaries = summarizeEffects(tier.preview.effects, ctx);
			appendUnique(summaryLines, flattenSummary(effectSummaries));
		}
		if (!summaryLines.length) {
			summaryLines.push('No effect');
		}
		const summary: Summary = [...summaryLines];

		const descriptionLines: string[] = [];
		appendUnique(descriptionLines, splitLines(tier.text?.description));
		const removal =
			tier.text?.removal ??
			(tier.display?.removalCondition
				? formatPassiveRemoval(tier.display.removalCondition)
				: undefined);
		appendUnique(descriptionLines, splitLines(removal));
		if (descriptionLines.length) {
			summary.push({
				title: 'Details',
				items: descriptionLines,
				_desc: true,
			});
		}
		return summary;
	}

	describe(tier: HappinessTierDefinition, ctx: EngineContext): Summary {
		return this.summarize(tier, ctx);
	}
}

registerContentTranslator('tier', new TierTranslator());
