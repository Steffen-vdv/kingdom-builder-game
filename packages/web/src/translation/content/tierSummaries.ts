import type { TranslationContext } from '../context';

function findTierSummary(
	context: TranslationContext,
	token: string,
): string | undefined {
	const fromRules = context.assets.tierSummaries.get(token);
	if (fromRules) {
		return fromRules;
	}
	const asset = context.assets.misc[token];
	return asset?.label ?? asset?.description;
}

export function translateTierSummary(
	context: TranslationContext,
	token: string | undefined,
): string | undefined {
	if (!token) {
		return undefined;
	}
	return findTierSummary(context, token);
}

export function hasTierSummaryTranslation(
	context: TranslationContext,
	token: string | undefined,
): boolean {
	if (!token) {
		return false;
	}
	return findTierSummary(context, token) !== undefined;
}
