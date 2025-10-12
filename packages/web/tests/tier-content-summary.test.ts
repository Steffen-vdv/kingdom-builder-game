import { describe, expect, it } from 'vitest';
import {
	summarizeContent,
	splitSummary,
	translateTierSummary,
} from '../src/translation';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';

function splitLines(text: string | undefined): string[] {
	if (!text) {
		return [];
	}
	return text
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function flattenSummary(entries: unknown[] | undefined): string[] {
	if (!entries) {
		return [];
	}
	const lines: string[] = [];
	const queue = [...entries];
	while (queue.length) {
		const entry = queue.shift();
		if (entry === undefined) {
			continue;
		}
		if (typeof entry === 'string') {
			lines.push(entry);
			continue;
		}
		if (entry && typeof entry === 'object') {
			const group = entry as { title?: string; items?: unknown[] };
			if (group.title) {
				lines.push(group.title);
			}
			if (Array.isArray(group.items)) {
				queue.unshift(...group.items);
			}
		}
	}
	return lines;
}

describe('tier content summaries', () => {
	it('summarizes tiers using canonical translators', () => {
		const { translationContext } = buildSyntheticTranslationContext();
		translationContext.rules.tierDefinitions.forEach((tier) => {
			const summary = summarizeContent('tier', tier, translationContext);
			const repeatedSummary = summarizeContent(
				'tier',
				tier,
				translationContext,
			);
			const { effects, description } = splitSummary(summary);
			const effectLines = flattenSummary(effects);
			const descriptionLines = flattenSummary(description);
			const translated = translateTierSummary(
				tier.display?.summaryToken,
				translationContext.assets,
			);
			const fallbackSummary = translated ?? tier.text?.summary;
			const expectedLines = splitLines(fallbackSummary);
			if (expectedLines.length) {
				expectedLines.forEach((line) => {
					expect(effectLines).toContain(line);
				});
			} else {
				expect(effectLines).toContain('No effect');
			}
			if (tier.text?.removal) {
				expect(effectLines).not.toContain(tier.text.removal);
				expect(descriptionLines).toContain(tier.text.removal);
			}
			expect(flattenSummary(repeatedSummary)).toEqual(flattenSummary(summary));
		});
	});
});
