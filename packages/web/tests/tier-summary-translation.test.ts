import { describe, it, expect } from 'vitest';
import {
	translateTierSummary,
	hasTierSummaryTranslation,
} from '../src/translation';
import { createEngine } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
} from '@kingdom-builder/contents';
import { createTranslationContextForEngine } from './helpers/createTranslationContextForEngine';

describe('tier summary translation', () => {
	const engine = createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
	});
	const baseAssets = createTranslationContextForEngine(engine).assets;

	it('returns summaries defined in content', () => {
		const entries = Object.entries(baseAssets.tierSummaries);
		if (entries.length === 0) {
			throw new Error('expected happiness tier summaries to be defined');
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

	describe('with multiple tiered resources', () => {
		const syntheticToken = 'tier.summary.synthetic';
		const firstSummary = 'Initial synthetic summary';
		const updatedSummary = 'Updated synthetic summary';

		it('reflects changes across tier groups', () => {
			const assets = {
				...baseAssets,
				tierSummaries: { ...baseAssets.tierSummaries },
			};
			assets.tierSummaries[syntheticToken] = firstSummary;
			expect(translateTierSummary(syntheticToken, assets)).toBe(firstSummary);
			expect(hasTierSummaryTranslation(syntheticToken, assets)).toBe(true);

			assets.tierSummaries[syntheticToken] = updatedSummary;
			expect(translateTierSummary(syntheticToken, assets)).toBe(updatedSummary);
		});
	});
});
