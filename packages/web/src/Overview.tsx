import React from 'react';
import Button from './components/common/Button';
import {
	ShowcaseBackground,
	ShowcaseLayout,
	ShowcaseCard,
	SHOWCASE_BADGE_CLASS,
	SHOWCASE_INTRO_CLASS,
} from './components/layouts/ShowcasePage';
import {
	OVERVIEW_BACK_BUTTON_CLASS,
	OVERVIEW_CARD_CLASS,
	OVERVIEW_GRID_CLASS,
	ParagraphSection,
	ListSection,
	renderTokens,
} from './components/overview/OverviewLayout';
import type { OverviewSectionDef } from './components/overview/OverviewLayout';
import { createOverviewSections } from './components/overview/sectionsData';
import type { OverviewContentSection } from './components/overview/sectionsData';
import type {
	OverviewTokenConfig,
	OverviewTokenSources,
} from './components/overview/overviewTokens';
import { createOverviewTokenSources } from './components/overview/overviewTokenUtils';
import {
	useOptionalRegistryMetadata,
	type RegistryMetadataContextValue,
} from './contexts/RegistryMetadataContext';
import type { OverviewTokenCandidates } from '@kingdom-builder/contents';
import type { OverviewTokenCandidateMap } from './contexts/registryMetadataSelectors';

type OverviewTokenRecord = Record<string, React.ReactNode>;

const EMPTY_SECTIONS_RESULT = Object.freeze({
	sections: Object.freeze([]) as ReadonlyArray<OverviewSectionDef>,
	tokens: Object.freeze({}) as OverviewTokenRecord,
});

function createFallbackSections(
	sections: OverviewContentSection[],
): OverviewSectionDef[] {
	return sections.map((section) => {
		if (section.kind === 'paragraph') {
			return {
				kind: 'paragraph',
				id: section.id,
				icon: null,
				title: section.title,
				paragraphs: section.paragraphs,
				span: section.span ?? false,
			} satisfies OverviewSectionDef;
		}

		return {
			kind: 'list',
			id: section.id,
			icon: null,
			title: section.title,
			items: section.items.map((item) => ({
				icon: item.icon ? null : undefined,
				label: item.label,
				body: item.body,
			})),
			span: section.span ?? false,
		} satisfies OverviewSectionDef;
	});
}

function collectTokenKeys(
	tokenCandidates: OverviewTokenCandidateMap | undefined,
	overrides?: OverviewTokenConfig,
): ReadonlyArray<string> {
	const keys = new Set<string>();
	const addKeys = (record?: Record<string, unknown>) => {
		if (!record) {
			return;
		}
		for (const key of Object.keys(record)) {
			keys.add(key);
		}
	};

	if (tokenCandidates) {
		for (const candidate of Object.values(tokenCandidates)) {
			addKeys(candidate as Record<string, unknown>);
		}
	}

	if (overrides) {
		for (const override of Object.values(overrides)) {
			addKeys(override);
		}
	}

	return Array.from(keys);
}

function createFallbackTokens(
	tokenCandidates: OverviewTokenCandidateMap | undefined,
	overrides: OverviewTokenConfig | undefined,
): OverviewTokenRecord {
	const keys = collectTokenKeys(tokenCandidates, overrides);
	const tokens: OverviewTokenRecord = {};
	for (const key of keys) {
		tokens[key] = <strong>{key}</strong>;
	}
	return tokens;
}

function cloneTokenCandidates(
	candidates: OverviewTokenCandidateMap | undefined,
): OverviewTokenCandidates {
	const clone: OverviewTokenCandidates = {};
	if (!candidates) {
		return clone;
	}
	const record = clone as Record<string, Record<string, string[]>>;
	for (const [category, entries] of Object.entries(candidates)) {
		const normalized: Record<string, string[]> = {};
		for (const [tokenKey, values] of Object.entries(entries)) {
			normalized[tokenKey] = Array.from(values);
		}
		record[category] = normalized;
	}
	return clone;
}

function resolveOverviewTokenSources(
	metadata: RegistryMetadataContextValue | null,
): OverviewTokenSources | null {
	if (!metadata) {
		return null;
	}
	const {
		actions,
		phaseMetadata,
		resourceMetadata,
		statMetadata,
		populationMetadata,
		landMetadata,
		slotMetadata,
	} = metadata;
	return createOverviewTokenSources({
		actions,
		phaseMetadata,
		resourceMetadata,
		statMetadata,
		populationMetadata,
		landMetadata,
		slotMetadata,
	});
}

export type { OverviewTokenConfig } from './components/overview/overviewTokens';

export interface OverviewProps {
	onBack: () => void;
	tokenConfig?: OverviewTokenConfig;
	content?: OverviewContentSection[];
}

export default function Overview({
	onBack,
	tokenConfig,
	content,
}: OverviewProps) {
	const metadata = useOptionalRegistryMetadata();
	const overviewContent = metadata?.overviewContent;
	const tokenCandidates = overviewContent?.tokens;
	const defaultTokens = React.useMemo(
		() => cloneTokenCandidates(tokenCandidates),
		[tokenCandidates],
	);
	const sections = React.useMemo<OverviewContentSection[]>(() => {
		if (content) {
			return content;
		}
		if (!overviewContent) {
			return [];
		}
		const baseSections = overviewContent.sections;
		return Array.from(baseSections) as OverviewContentSection[];
	}, [content, overviewContent]);
	const heroContent = overviewContent?.hero;
	const tokenSources = React.useMemo(
		() => resolveOverviewTokenSources(metadata),
		[metadata],
	);
	const { sections: renderedSections, tokens: iconTokens } =
		React.useMemo(() => {
			if (sections.length === 0) {
				return EMPTY_SECTIONS_RESULT;
			}

			if (!tokenSources) {
				return {
					sections: createFallbackSections(sections),
					tokens: createFallbackTokens(tokenCandidates, tokenConfig),
				};
			}

			return createOverviewSections(
				defaultTokens,
				tokenConfig,
				sections,
				tokenSources,
			);
		}, [defaultTokens, sections, tokenConfig, tokenSources]);
	const tokens = React.useMemo(() => ({ ...iconTokens }), [iconTokens]);

	const heroTokens: OverviewTokenRecord = React.useMemo(() => {
		const heroTokenNodes: Record<string, React.ReactNode> = {};
		const tokenEntries = heroContent?.tokens ?? {};
		for (const [tokenKey, label] of Object.entries(tokenEntries)) {
			heroTokenNodes[tokenKey] = <strong>{label}</strong>;
		}
		return { ...tokens, ...heroTokenNodes };
	}, [heroContent?.tokens, tokens]);

	const heroBadgeIcon = heroContent?.badgeIcon ?? '';
	const heroBadgeLabel = heroContent?.badgeLabel ?? '';
	const heroTitle = heroContent?.title ?? '';
	const heroIntro = heroContent?.intro ?? '';
	const heroParagraph = heroContent?.paragraph ?? '';

	const renderSection = (section: OverviewSectionDef) => {
		if (section.kind === 'paragraph') {
			const paragraphs = section.paragraphs.map((text) =>
				renderTokens(text, tokens),
			);
			return (
				<ParagraphSection
					key={section.id}
					icon={section.icon}
					title={section.title}
					span={section.span ?? false}
					paragraphs={paragraphs}
				/>
			);
		}
		const items = section.items.map((item) => ({
			icon: item.icon,
			label: item.label,
			body: item.body.map((text) => renderTokens(text, tokens)),
		}));
		return (
			<ListSection
				key={section.id}
				icon={section.icon}
				title={section.title}
				span={section.span ?? false}
				items={items}
			/>
		);
	};

	return (
		<ShowcaseBackground>
			<ShowcaseLayout className="items-center">
				<header className="flex flex-col items-center text-center">
					<span className={SHOWCASE_BADGE_CLASS}>
						<span className="text-lg">{heroBadgeIcon}</span>
						<span>{heroBadgeLabel}</span>
					</span>
					<h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
						{heroTitle}
					</h1>
					<p className={SHOWCASE_INTRO_CLASS}>
						{renderTokens(heroIntro, heroTokens)}
					</p>
				</header>

				<ShowcaseCard as="article" className={OVERVIEW_CARD_CLASS}>
					<p className="text-base leading-relaxed">
						{renderTokens(heroParagraph, heroTokens)}
					</p>

					<div className={OVERVIEW_GRID_CLASS}>
						{renderedSections.map(renderSection)}
					</div>
				</ShowcaseCard>

				<Button
					variant="ghost"
					className={OVERVIEW_BACK_BUTTON_CLASS}
					onClick={onBack}
					icon="🏰"
				>
					Back to Start
				</Button>
			</ShowcaseLayout>
		</ShowcaseBackground>
	);
}
