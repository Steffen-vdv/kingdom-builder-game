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
import {
	OVERVIEW_CONTENT,
	type OverviewTokenCandidates,
} from '@kingdom-builder/contents';
import type { SessionOverviewHero } from '@kingdom-builder/protocol/session';

type OverviewTokenRecord = Record<string, React.ReactNode>;

const EMPTY_SECTIONS_RESULT = Object.freeze({
	sections: Object.freeze([]) as ReadonlyArray<OverviewSectionDef>,
	tokens: Object.freeze({}) as OverviewTokenRecord,
});

const DEFAULT_HERO_CONTENT: SessionOverviewHero = Object.freeze({
	tokens: {},
});

const EMPTY_HERO_TOKEN_SOURCE = Object.freeze({}) as Readonly<
	Record<string, string>
>;

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
	tokenCandidates: OverviewTokenCandidates,
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

	for (const candidate of Object.values(tokenCandidates)) {
		addKeys(candidate);
	}

	if (overrides) {
		for (const override of Object.values(overrides)) {
			addKeys(override);
		}
	}

	return Array.from(keys);
}

function createFallbackTokens(
	tokenCandidates: OverviewTokenCandidates,
	overrides: OverviewTokenConfig | undefined,
): OverviewTokenRecord {
	const keys = collectTokenKeys(tokenCandidates, overrides);
	const tokens: OverviewTokenRecord = {};
	for (const key of keys) {
		tokens[key] = <strong>{key}</strong>;
	}
	return tokens;
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
	const overviewContent = metadata?.overviewContent ?? OVERVIEW_CONTENT;
	const sections = content ?? overviewContent.sections ?? [];
	const defaultTokens: OverviewTokenCandidates = overviewContent.tokens ?? {};
	const heroContent = overviewContent.hero ?? DEFAULT_HERO_CONTENT;
	const heroTokenSource = heroContent.tokens ?? EMPTY_HERO_TOKEN_SOURCE;
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
					tokens: createFallbackTokens(defaultTokens, tokenConfig),
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

	const heroTokens: Record<string, React.ReactNode> = React.useMemo(() => {
		const heroTokenNodes: Record<string, React.ReactNode> = {};
		for (const [tokenKey, label] of Object.entries(heroTokenSource)) {
			heroTokenNodes[tokenKey] = <strong>{label}</strong>;
		}
		return { ...tokens, ...heroTokenNodes };
	}, [heroTokenSource, tokens]);

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
						<span className="text-lg">{heroContent.badgeIcon ?? ''}</span>
						<span>{heroContent.badgeLabel ?? ''}</span>
					</span>
					<h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
						{heroContent.title ?? ''}
					</h1>
					<p className={SHOWCASE_INTRO_CLASS}>
						{renderTokens(heroContent.intro ?? '', heroTokens)}
					</p>
				</header>

				<ShowcaseCard as="article" className={OVERVIEW_CARD_CLASS}>
					<p className="text-base leading-relaxed">
						{renderTokens(heroContent.paragraph ?? '', heroTokens)}
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
