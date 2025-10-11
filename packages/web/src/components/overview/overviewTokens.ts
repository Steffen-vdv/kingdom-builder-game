import type { OverviewIconSet } from './sectionsData';
import {
	hasOwn,
	mergeTokenConfig,
	type OverviewTokenConfig,
	type OverviewTokenCategoryResolver,
} from './overviewTokenUtils';

export type {
	OverviewTokenConfig,
	TokenCandidateInput,
} from './overviewTokenUtils';

export function buildOverviewIconSet(
	overrides: OverviewTokenConfig | undefined,
	categories: ReadonlyArray<OverviewTokenCategoryResolver>,
): OverviewIconSet {
	const config = mergeTokenConfig(overrides, categories);
	const icons: OverviewIconSet = {};

	for (const { name, resolve } of categories) {
		const overrideSource = overrides?.[name];

		for (const [tokenKey, candidates] of Object.entries(config[name])) {
			const hasOverride = hasOwn(overrideSource, tokenKey);
			const hasExistingValue =
				hasOwn(icons, tokenKey) &&
				icons[tokenKey] !== undefined &&
				icons[tokenKey] !== null;

			if (hasExistingValue && !hasOverride) {
				continue;
			}

			const resolvedIcon = resolve(candidates);

			if (resolvedIcon !== undefined) {
				icons[tokenKey] = resolvedIcon;
			} else if (!hasExistingValue) {
				icons[tokenKey] = undefined;
			}
		}
	}

	return icons;
}
