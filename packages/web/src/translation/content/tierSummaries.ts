import { TIER_SUMMARY_STORE } from '@kingdom-builder/contents';

function findTierSummary(token: string): string | undefined {
	for (const summaries of TIER_SUMMARY_STORE.values()) {
		const summary = summaries.get(token);
		if (summary !== undefined) {
			return summary;
		}
	}
	return undefined;
}

export function translateTierSummary(
	token: string | undefined,
): string | undefined {
	if (!token) {
		return undefined;
	}
	return findTierSummary(token);
}

export function hasTierSummaryTranslation(token: string | undefined): boolean {
	if (!token) {
		return false;
	}
	return findTierSummary(token) !== undefined;
}
