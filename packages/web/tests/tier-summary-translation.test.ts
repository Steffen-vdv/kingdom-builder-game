import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Resource, TIER_SUMMARY_STORE } from '@kingdom-builder/contents';
import {
	translateTierSummary,
	hasTierSummaryTranslation,
} from '../src/translation';

describe('tier summary translation', () => {
	it('returns summaries defined in content', () => {
		const happinessSummaries = TIER_SUMMARY_STORE.get(Resource.happiness);
		if (!happinessSummaries || happinessSummaries.size === 0) {
			throw new Error('expected happiness tier summaries to be defined');
		}
		const iterator = happinessSummaries.entries().next();
		if (iterator.done) {
			throw new Error('expected at least one happiness tier summary entry');
		}
		const [token, summary] = iterator.value;

		expect(translateTierSummary(token)).toBe(summary);
		expect(hasTierSummaryTranslation(token)).toBe(true);
	});

	it('handles missing tokens gracefully', () => {
		const missingToken = 'tier.summary.missing';

		expect(translateTierSummary(missingToken)).toBeUndefined();
		expect(translateTierSummary(undefined)).toBeUndefined();
		expect(hasTierSummaryTranslation(missingToken)).toBe(false);
		expect(hasTierSummaryTranslation(undefined)).toBe(false);
	});

	describe('with multiple tiered resources', () => {
		const syntheticToken = 'tier.summary.synthetic';
		const firstSummary = 'Initial synthetic summary';
		const updatedSummary = 'Updated synthetic summary';
		let originalGroup: Map<string, string> | undefined;

		beforeEach(() => {
			originalGroup = TIER_SUMMARY_STORE.get(Resource.gold);
		});

		afterEach(() => {
			if (originalGroup) {
				TIER_SUMMARY_STORE.set(Resource.gold, originalGroup);
			} else {
				TIER_SUMMARY_STORE.delete(Resource.gold);
			}
		});

		it('reflects changes across tier groups', () => {
			const syntheticGroup = new Map<string, string>();
			TIER_SUMMARY_STORE.set(Resource.gold, syntheticGroup);

			syntheticGroup.set(syntheticToken, firstSummary);
			expect(translateTierSummary(syntheticToken)).toBe(firstSummary);
			expect(hasTierSummaryTranslation(syntheticToken)).toBe(true);

			syntheticGroup.set(syntheticToken, updatedSummary);
			expect(translateTierSummary(syntheticToken)).toBe(updatedSummary);
		});
	});
});
