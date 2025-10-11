import React from 'react';
import {
	createActionRegistry,
	createBuildingRegistry,
	createDevelopmentRegistry,
	createPopulationRegistry,
	LAND_INFO,
	PASSIVE_INFO,
	PHASES,
	POPULATION_ROLES,
	RESOURCES,
	SLOT_INFO,
	STATS,
} from '@kingdom-builder/contents';
import type {
	SessionResourceDefinition,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
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
import { createOverviewTokenSources } from './components/overview/overviewTokenUtils';
import {
	RegistryMetadataProvider,
	useOptionalRegistryMetadata,
	useRegistryMetadata,
} from './contexts/RegistryMetadataContext';
import type { SessionRegistries } from './state/sessionRegistries';

export type { OverviewTokenConfig } from './components/overview/overviewTokens';

export interface OverviewProps {
	onBack: () => void;
	tokenConfig?: OverviewTokenConfig;
	content?: OverviewContentSection[];
}

const FALLBACK_RESOURCES: Readonly<Record<string, SessionResourceDefinition>> =
	Object.freeze(
		Object.fromEntries(
			Object.entries(RESOURCES).map(([key, resource]) => {
				const definition: SessionResourceDefinition = { key: resource.key };
				if (resource.icon) {
					definition.icon = resource.icon;
				}
				if (resource.label) {
					definition.label = resource.label;
				}
				if (resource.description) {
					definition.description = resource.description;
				}
				if (resource.tags && resource.tags.length > 0) {
					definition.tags = [...resource.tags];
				}
				return [key, Object.freeze(definition)] as const;
			}),
		),
	);

type MetadataDescriptor = {
	label?: string;
	icon?: string;
	description?: string;
};

type InfoRecord<TValue extends MetadataDescriptor> = Record<string, TValue>;

const mapInfoRecord = <TValue extends MetadataDescriptor>(
	record: InfoRecord<TValue>,
) =>
	Object.freeze(
		Object.fromEntries(
			Object.entries(record).map(([key, value]) => {
				const descriptor: MetadataDescriptor = {};
				if (value.label) {
					descriptor.label = value.label;
				}
				if (value.icon) {
					descriptor.icon = value.icon;
				}
				if (value.description) {
					descriptor.description = value.description;
				}
				return [key, Object.freeze(descriptor)] as const;
			}),
		),
	);

const FALLBACK_PHASE_METADATA = Object.freeze(
	Object.fromEntries(
		PHASES.map((phase) => {
			const steps = Object.freeze(
				(phase.steps ?? []).map((step) => {
					const descriptor: Record<string, unknown> = { id: step.id };
					if (step.title) {
						descriptor.title = step.title;
					}
					if (step.icon) {
						descriptor.icon = step.icon;
					}
					if (step.triggers) {
						descriptor.triggers = [...step.triggers];
					}
					return Object.freeze(descriptor);
				}),
			);
			const entry: Record<string, unknown> = {
				label: phase.label ?? phase.id,
				action: Boolean(phase.action),
				steps,
			};
			if (phase.icon) {
				entry.icon = phase.icon;
			}
			return [phase.id, Object.freeze(entry)] as const;
		}),
	),
) as NonNullable<SessionSnapshotMetadata['phases']>;

const FALLBACK_METADATA: SessionSnapshotMetadata = Object.freeze({
	passiveEvaluationModifiers: {},
	resources: mapInfoRecord(RESOURCES),
	populations: mapInfoRecord(POPULATION_ROLES),
	buildings: {},
	developments: {},
	stats: mapInfoRecord(STATS),
	phases: FALLBACK_PHASE_METADATA,
	triggers: {},
	assets: Object.freeze({
		land: Object.freeze({ label: LAND_INFO.label, icon: LAND_INFO.icon }),
		slot: Object.freeze({ label: SLOT_INFO.label, icon: SLOT_INFO.icon }),
		passive: Object.freeze({
			label: PASSIVE_INFO.label,
			icon: PASSIVE_INFO.icon,
		}),
	}),
}) as SessionSnapshotMetadata;

const FALLBACK_REGISTRIES: SessionRegistries = Object.freeze({
	actions: createActionRegistry(),
	buildings: createBuildingRegistry(),
	developments: createDevelopmentRegistry(),
	populations: createPopulationRegistry(),
	resources: FALLBACK_RESOURCES,
});

function OverviewContent({ onBack, tokenConfig, content }: OverviewProps) {
	const {
		overviewContent,
		actions,
		phaseMetadata,
		resourceMetadata,
		statMetadata,
		populationMetadata,
		landMetadata,
		slotMetadata,
	} = useRegistryMetadata();
	const sections = content ?? overviewContent.sections;
	const defaultTokens = overviewContent.tokens;
	const heroContent = overviewContent.hero;
	const tokenSources = React.useMemo(
		() =>
			createOverviewTokenSources({
				actions,
				phaseMetadata,
				resourceMetadata,
				statMetadata,
				populationMetadata,
				landMetadata,
				slotMetadata,
			}),
		[
			actions,
			phaseMetadata,
			resourceMetadata,
			statMetadata,
			populationMetadata,
			landMetadata,
			slotMetadata,
		],
	);
	const { sections: renderedSections, tokens: iconTokens } = React.useMemo(
		() =>
			createOverviewSections(
				defaultTokens,
				tokenConfig,
				sections,
				tokenSources,
			),
		[defaultTokens, sections, tokenConfig, tokenSources],
	);
	const tokens = React.useMemo(() => ({ ...iconTokens }), [iconTokens]);

	const heroTokens: Record<string, React.ReactNode> = React.useMemo(() => {
		const heroTokenNodes: Record<string, React.ReactNode> = {};
		for (const [tokenKey, label] of Object.entries(heroContent.tokens)) {
			heroTokenNodes[tokenKey] = <strong>{label}</strong>;
		}
		return { ...tokens, ...heroTokenNodes };
	}, [heroContent.tokens, tokens]);

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
						<span className="text-lg">{heroContent.badgeIcon}</span>
						<span>{heroContent.badgeLabel}</span>
					</span>
					<h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
						{heroContent.title}
					</h1>
					<p className={SHOWCASE_INTRO_CLASS}>
						{renderTokens(heroContent.intro, heroTokens)}
					</p>
				</header>

				<ShowcaseCard as="article" className={OVERVIEW_CARD_CLASS}>
					<p className="text-base leading-relaxed">
						{renderTokens(heroContent.paragraph, heroTokens)}
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

export default function Overview(props: OverviewProps) {
	const registryMetadata = useOptionalRegistryMetadata();
	if (registryMetadata) {
		return <OverviewContent {...props} />;
	}

	return (
		<RegistryMetadataProvider
			registries={FALLBACK_REGISTRIES}
			metadata={FALLBACK_METADATA}
		>
			<OverviewContent {...props} />
		</RegistryMetadataProvider>
	);
}
