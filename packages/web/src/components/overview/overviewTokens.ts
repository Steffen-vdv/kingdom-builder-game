import type { OverviewIconSet } from './sectionsData';
import type { SessionOverviewTokenCandidates } from '@kingdom-builder/protocol/session';
import {
	createCategoryConfig,
	hasOwn,
	mergeTokenConfig,
	type OverviewTokenConfig,
	type OverviewTokenSources,
} from './overviewTokenUtils';

export type {
	OverviewTokenConfig,
	TokenCandidateInput,
	OverviewTokenSources,
} from './overviewTokenUtils';

export function buildOverviewIconSet(
	sources: OverviewTokenSources,
	tokenCandidates: SessionOverviewTokenCandidates | undefined,
	overrides?: OverviewTokenConfig,
): OverviewIconSet {
	const config = mergeTokenConfig(sources, tokenCandidates, overrides);
	const categoryConfig = createCategoryConfig(sources);
	const icons: OverviewIconSet = {};

	for (const { name, resolve } of categoryConfig) {
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
