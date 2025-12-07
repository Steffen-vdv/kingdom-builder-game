import type { RuleSet } from '@kingdom-builder/protocol';
import type { ResourceTierTrackMetadata } from './resource';
import { RULES } from './rules';

export type TierSummaryGroup = Map<string, string>;
export type TierSummaryStore = Map<string, TierSummaryGroup>;

type TierMetadataRuleSet = RuleSet & {
	tieredResourceId?: string;
	tierTrackMetadata?: ResourceTierTrackMetadata;
};

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

function buildTierSummaryStore(ruleSets: TierMetadataRuleSet[]): TierSummaryStore {
	const store: TierSummaryStore = new Map();
	ruleSets.forEach((ruleSet) => {
		const summaries = extractTierSummaries(ruleSet);
		if (summaries.size > 0) {
			store.set(ruleSet.tieredResourceKey, summaries);
			if (ruleSet.tieredResourceId) {
				store.set(ruleSet.tieredResourceId, summaries);
			}
			const metadataId = ruleSet.tierTrackMetadata?.id;
			if (metadataId) {
				store.set(metadataId, summaries);
			}
		}
	});
	return store;
}

export const TIER_SUMMARY_STORE: TierSummaryStore = buildTierSummaryStore([RULES]);
