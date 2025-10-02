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
import { buildOverviewIconSet } from './components/overview/overviewTokens';
import type { OverviewTokenConfig } from './components/overview/overviewTokens';
import { DEFAULT_OVERVIEW_CONTENT } from './components/overview/defaultContent';

export type { OverviewTokenConfig } from './components/overview/overviewTokens';

export interface OverviewProps {
	onBack: () => void;
	tokenConfig?: OverviewTokenConfig;
	content?: OverviewContentSection[];
}

const HERO_INTRO_TEXT = [
	'Map the rhythms of the realm before you issue your first decree.',
	'Know where every resource, phase, and population surge will carry you.',
].join(' ');

const HERO_PARAGRAPH_TEXT = [
	'Welcome to {game}, a brisk duel of wits where {expand} expansion,',
	'{build} clever construction, and {attack} daring raids decide who steers the crown.',
].join(' ');

export default function Overview({
	onBack,
	tokenConfig,
	content,
}: OverviewProps) {
	const icons = React.useMemo(
		() => buildOverviewIconSet(tokenConfig),
		[tokenConfig],
	);

	const sections = content ?? DEFAULT_OVERVIEW_CONTENT;

	const tokens: Record<string, React.ReactNode> = {
		castle: icons.castle,
		army: icons.army,
		fort: icons.fort,
		ap: icons.ap,
		expand: icons.expand,
		develop: icons.develop,
		raisePop: icons.raisePop,
		attack: icons.attack,
		build: icons.build,
		land: icons.land,
		slot: icons.slot,
		gold: icons.gold,
		main: icons.main,
		growth: icons.growth,
		upkeep: icons.upkeep,
		happiness: icons.happiness,
		council: icons.council,
		legion: icons.legion,
		fortifier: icons.fortifier,
		citizen: icons.citizen,
	};

	const heroTokens: Record<string, React.ReactNode> = {
		...tokens,
		game: <strong>Kingdom Builder</strong>,
	};

	const renderedSections = createOverviewSections(icons, sections);

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
						<span className="text-lg">📘</span>
						<span>Know The Realm</span>
					</span>
					<h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
						Game Overview
					</h1>
					<p className={SHOWCASE_INTRO_CLASS}>{HERO_INTRO_TEXT}</p>
				</header>

				<ShowcaseCard as="article" className={OVERVIEW_CARD_CLASS}>
					<p className="text-base leading-relaxed">
						{renderTokens(HERO_PARAGRAPH_TEXT, heroTokens)}
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
