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
import {
	createOverviewSections,
	type OverviewContentSection,
	type OverviewTokenCandidates,
} from './components/overview/sectionsData';
import type { OverviewTokenConfig } from './components/overview/overviewTokens';
import { createOverviewTokenSources } from './components/overview/overviewTokenUtils';
import { useRegistryMetadata } from './contexts/RegistryMetadataContext';
import type { SessionOverviewHero } from '@kingdom-builder/protocol/session';

const DEFAULT_HERO_CONTENT: SessionOverviewHero = Object.freeze({
	tokens: {},
});

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
	const {
		actions,
		phaseMetadata,
		resourceMetadata,
		statMetadata,
		landMetadata,
		slotMetadata,
		overviewContent,
	} = useRegistryMetadata();
	const sections = content ?? overviewContent.sections ?? [];
	const defaultTokens: OverviewTokenCandidates = overviewContent.tokens ?? {};
	const heroContent = overviewContent.hero ?? DEFAULT_HERO_CONTENT;
	const heroTokenSource = heroContent.tokens ?? {};
	const tokenSources = React.useMemo(
		() =>
			createOverviewTokenSources({
				actions,
				phaseMetadata,
				resourceMetadata,
				statMetadata,
				landMetadata,
				slotMetadata,
			}),
		[
			actions,
			phaseMetadata,
			resourceMetadata,
			statMetadata,
			landMetadata,
			slotMetadata,
		],
	);
	const { sections: renderedSections, tokens: iconTokens } =
		React.useMemo(() => {
			return createOverviewSections(
				defaultTokens,
				tokenConfig,
				sections,
				tokenSources,
			);
		}, [defaultTokens, sections, tokenConfig, tokenSources]);

	const heroTokens: Record<string, React.ReactNode> = React.useMemo(() => {
		const heroTokenNodes: Record<string, React.ReactNode> = {};
		for (const [tokenKey, label] of Object.entries(heroTokenSource)) {
			heroTokenNodes[tokenKey] = <strong>{label ?? tokenKey}</strong>;
		}
		return { ...iconTokens, ...heroTokenNodes };
	}, [heroTokenSource, iconTokens]);

	const renderSection = (section: OverviewSectionDef) => {
		if (section.kind === 'paragraph') {
			const paragraphs = section.paragraphs.map((text) =>
				renderTokens(text, iconTokens),
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
			body: item.body.map((text) => renderTokens(text, iconTokens)),
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
