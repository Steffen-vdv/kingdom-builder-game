import type { OverviewIconSet } from './sectionsData';
import {
	CATEGORY_CONFIG,
	hasOwn,
	mergeTokenConfig,
	type OverviewTokenConfig,
} from './overviewTokenUtils';

export type {
	OverviewTokenConfig,
	TokenCandidateInput,
} from './overviewTokenUtils';

export function buildOverviewIconSet(
	overrides?: OverviewTokenConfig,
): OverviewIconSet {
	const config = mergeTokenConfig(overrides);
	const icons: OverviewIconSet = {};

	for (const { name, resolve } of CATEGORY_CONFIG) {
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
