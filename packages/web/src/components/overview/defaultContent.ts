import type {
	OverviewHeroTemplate,
	OverviewSectionTemplate,
	OverviewTokenCandidates,
} from '@kingdom-builder/contents';
import { OVERVIEW_CONTENT } from '@kingdom-builder/contents';

export type OverviewHeroContent = OverviewHeroTemplate;
export type OverviewContentSection = OverviewSectionTemplate;
export type OverviewTokenCandidatesSource = OverviewTokenCandidates;

export const DEFAULT_OVERVIEW_HERO: OverviewHeroContent = OVERVIEW_CONTENT.hero;
export const DEFAULT_OVERVIEW_SECTIONS: OverviewContentSection[] =
	OVERVIEW_CONTENT.sections;
export const DEFAULT_OVERVIEW_TOKENS: OverviewTokenCandidatesSource =
	OVERVIEW_CONTENT.tokens;
