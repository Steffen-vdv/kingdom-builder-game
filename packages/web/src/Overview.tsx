import React from 'react';
import { OVERVIEW_CONTENT } from '@kingdom-builder/contents';
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
import type { OverviewTokenConfig } from './components/overview/overviewTokens';

export type { OverviewTokenConfig } from './components/overview/overviewTokens';

export interface OverviewProps {
	onBack: () => void;
	tokenConfig?: OverviewTokenConfig;
	content?: OverviewContentSection[];
}

const DEFAULT_SECTIONS = OVERVIEW_CONTENT.sections;
const DEFAULT_TOKENS = OVERVIEW_CONTENT.tokens;
const HERO_CONTENT = OVERVIEW_CONTENT.hero;

export default function Overview({
	onBack,
	tokenConfig,
	content,
}: OverviewProps) {
	const sections = content ?? DEFAULT_SECTIONS;
	const { sections: renderedSections, tokens: iconTokens } = React.useMemo(
		() => createOverviewSections(DEFAULT_TOKENS, tokenConfig, sections),
		[sections, tokenConfig],
	);
	const tokens = React.useMemo(() => ({ ...iconTokens }), [iconTokens]);

	const heroTokens: Record<string, React.ReactNode> = React.useMemo(() => {
		const heroTokenNodes: Record<string, React.ReactNode> = {};
		for (const [tokenKey, label] of Object.entries(HERO_CONTENT.tokens)) {
			heroTokenNodes[tokenKey] = <strong>{label}</strong>;
		}
		return { ...tokens, ...heroTokenNodes };
	}, [tokens]);

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
						<span className="text-lg">{HERO_CONTENT.badgeIcon}</span>
						<span>{HERO_CONTENT.badgeLabel}</span>
					</span>
					<h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
						{HERO_CONTENT.title}
					</h1>
					<p className={SHOWCASE_INTRO_CLASS}>
						{renderTokens(HERO_CONTENT.intro, heroTokens)}
					</p>
				</header>

				<ShowcaseCard as="article" className={OVERVIEW_CARD_CLASS}>
					<p className="text-base leading-relaxed">
						{renderTokens(HERO_CONTENT.paragraph, heroTokens)}
					</p>

					<div className={OVERVIEW_GRID_CLASS}>
						{renderedSections.map(renderSection)}
					</div>
				</ShowcaseCard>

				<Button
					variant="ghost"
					className={OVERVIEW_BACK_BUTTON_CLASS}
					onClick={onBack}
				>
					Back to Start
				</Button>
			</ShowcaseLayout>
		</ShowcaseBackground>
	);
}
