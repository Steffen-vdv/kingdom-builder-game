import { describe, it, expect } from 'vitest';
import {
	translateTierSummary,
	hasTierSummaryTranslation,
} from '../src/translation';
import type { TranslationContext } from '../src/translation/context';
import {
	createTranslationContextStub,
	toTranslationPlayer,
} from './helpers/translationContextStub';

function createContextWithSummaries(
	summaries: Map<string, string>,
): TranslationContext {
	return createTranslationContextStub({
		phases: [],
		actionCostResource: undefined,
		activePlayer: toTranslationPlayer({
			id: 'A',
			name: 'Active',
			resources: {},
			population: {},
		}),
		opponent: toTranslationPlayer({
			id: 'B',
			name: 'Opponent',
			resources: {},
			population: {},
		}),
		assets: {
			resources: Object.freeze({}),
			stats: Object.freeze({}),
			populations: Object.freeze({}),
			population: Object.freeze({}),
			land: Object.freeze({}),
			slot: Object.freeze({}),
			passive: Object.freeze({}),
			modifiers: Object.freeze({}),
			triggers: Object.freeze({}),
			misc: Object.freeze({}),
			tierSummaries: summaries,
			formatPassiveRemoval: (description: string) =>
				`Active as long as ${description}`,
		} as TranslationContext['assets'],
	});
}

describe('tier summary translation', () => {
	it('returns summaries defined in content', () => {
		const token = 'tier.summary.happiness.one';
		const summary = 'Gain 5 happiness.';
		const summaries = new Map<string, string>([[token, summary]]);
		const context = createContextWithSummaries(summaries);

		expect(translateTierSummary(context, token)).toBe(summary);
		expect(hasTierSummaryTranslation(context, token)).toBe(true);
	});

	it('handles missing tokens gracefully', () => {
		const missingToken = 'tier.summary.missing';
		const context = createContextWithSummaries(new Map());

		expect(translateTierSummary(context, missingToken)).toBeUndefined();
		expect(translateTierSummary(context, undefined)).toBeUndefined();
		expect(hasTierSummaryTranslation(context, missingToken)).toBe(false);
		expect(hasTierSummaryTranslation(context, undefined)).toBe(false);
	});

	it('reflects updates within the tier summary map', () => {
		const token = 'tier.summary.synthetic';
		const firstSummary = 'Initial synthetic summary';
		const updatedSummary = 'Updated synthetic summary';
		const summaries = new Map<string, string>();
		const context = createContextWithSummaries(summaries);

		summaries.set(token, firstSummary);
		expect(translateTierSummary(context, token)).toBe(firstSummary);
		expect(hasTierSummaryTranslation(context, token)).toBe(true);

		summaries.set(token, updatedSummary);
		expect(translateTierSummary(context, token)).toBe(updatedSummary);
	});
});
