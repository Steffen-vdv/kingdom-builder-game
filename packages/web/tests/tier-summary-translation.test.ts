import { describe, it, expect } from 'vitest';
import {
	translateTierSummary,
	hasTierSummaryTranslation,
} from '../src/translation';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';

describe('tier summary translation', () => {
	const { translationContext, session } = buildSyntheticTranslationContext();
	const baseAssets = translationContext.assets;

	it('returns summaries defined in content', () => {
		const entries = Object.entries(baseAssets.tierSummaries);
		if (entries.length === 0) {
			throw new Error('expected tier summaries to be defined');
		}
		const [token, summary] = entries[0]!;
		expect(translateTierSummary(token, baseAssets)).toBe(summary);
		expect(hasTierSummaryTranslation(token, baseAssets)).toBe(true);
	});

	it('handles missing tokens gracefully', () => {
		const missingToken = 'tier.summary.missing';

		expect(translateTierSummary(missingToken, baseAssets)).toBeUndefined();
		expect(translateTierSummary(undefined, baseAssets)).toBeUndefined();
		expect(hasTierSummaryTranslation(missingToken, baseAssets)).toBe(false);
		expect(hasTierSummaryTranslation(undefined, baseAssets)).toBe(false);
	});

	it('falls back to tier definition text when summary assets are removed', () => {
		const tierDefinition = session.rules.tierDefinitions.find((definition) => {
			return (
				typeof definition.display?.summaryToken === 'string' &&
				typeof definition.text?.summary === 'string'
			);
		});
		if (!tierDefinition) {
			throw new Error(
				'expected at least one tier definition with summary text',
			);
		}
		const token = tierDefinition.display?.summaryToken as string;
		const assets = {
			...baseAssets,
			tierSummaries: { ...baseAssets.tierSummaries },
		};
		delete assets.tierSummaries[token];
		expect(translateTierSummary(token, baseAssets)).toBe(
			tierDefinition.text?.summary,
		);
		expect(translateTierSummary(token, assets)).toBeUndefined();
		expect(hasTierSummaryTranslation(token, assets)).toBe(false);
		expect(tierDefinition.text?.summary).toBeDefined();
	});
});
