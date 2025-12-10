import { type Summary } from '../../translation';

function createRequirementSet(requirements: readonly string[]): Set<string> {
	const trimmed = requirements.map((requirement) => requirement.trim());
	return new Set(trimmed.filter((requirement) => requirement.length > 0));
}

function filterEntries(entries: Summary, requirementSet: Set<string>): Summary {
	const filtered: Summary = [];
	for (const entry of entries) {
		if (typeof entry === 'string') {
			if (requirementSet.has(entry.trim())) {
				continue;
			}
			filtered.push(entry);
			continue;
		}
		const nested = filterEntries(entry.items, requirementSet);
		if (nested.length > 0) {
			filtered.push({ ...entry, items: nested });
		}
	}
	return filtered;
}

export function stripSummary(
	summary: Summary | undefined,
	requirements: readonly string[],
): Summary | undefined {
	const first = summary?.[0];
	// Only unwrap a single SummaryGroup wrapper if it has no title
	const isEmptyWrapper =
		first &&
		typeof first !== 'string' &&
		!first.title?.trim() &&
		summary?.length === 1;
	const baseSummary = isEmptyWrapper ? first.items : summary;
	if (!baseSummary) {
		return baseSummary;
	}
	if (requirements.length === 0) {
		return baseSummary;
	}
	const requirementSet = createRequirementSet(requirements);
	const filtered = filterEntries(baseSummary, requirementSet);
	return filtered.length > 0 ? filtered : undefined;
}
