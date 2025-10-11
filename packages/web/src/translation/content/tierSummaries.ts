import type { TranslationAssets } from '../context';
import { selectTierSummary } from '../context/assetSelectors';

export function translateTierSummary(
	token: string | undefined,
	assets?: TranslationAssets,
): string | undefined {
	return selectTierSummary(assets, token);
}

export function hasTierSummaryTranslation(
	token: string | undefined,
	assets?: TranslationAssets,
): boolean {
	return selectTierSummary(assets, token) !== undefined;
}
