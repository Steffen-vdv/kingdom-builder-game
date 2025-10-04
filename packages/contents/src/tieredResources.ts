import type { RuleSet } from '@kingdom-builder/engine/services';
import type { ResourceKey } from './resources';
import { RULES } from './rules';

export type TierSummaryGroup = Map<string, string>;
export type TierSummaryStore = Map<ResourceKey, TierSummaryGroup>;

function extractTierSummaries(ruleSet: RuleSet): TierSummaryGroup {
	const summaries: TierSummaryGroup = new Map();
	ruleSet.tierDefinitions.forEach((definition) => {
		const token = definition.display?.summaryToken;
		const summary = definition.text?.summary;
		if (token && summary !== undefined) {
			summaries.set(token, summary);
		}
	});
	return summaries;
}

function buildTierSummaryStore(ruleSets: RuleSet[]): TierSummaryStore {
	const store: TierSummaryStore = new Map();
	ruleSets.forEach((ruleSet) => {
		const summaries = extractTierSummaries(ruleSet);
		if (summaries.size > 0) {
			store.set(ruleSet.tieredResourceKey as ResourceKey, summaries);
		}
	});
	return store;
}

export const TIER_SUMMARY_STORE: TierSummaryStore = buildTierSummaryStore([
	RULES,
]);
