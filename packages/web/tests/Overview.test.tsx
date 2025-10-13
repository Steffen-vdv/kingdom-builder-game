/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import Overview, { type OverviewTokenConfig } from '../src/Overview';
import { DEFAULT_OVERVIEW_CONTENT } from '../src/contexts/defaultRegistryMetadata';
import type { OverviewContentSection } from '../src/components/overview/sectionsData';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import {
	createSessionRegistries,
	createDefaultRegistryMetadata,
} from './helpers/sessionRegistries';

afterEach(cleanup);

describe('<Overview />', () => {
	it('renders snapshot defaults when registry metadata is unavailable', () => {
		render(<Overview onBack={vi.fn()} />);
		const { hero } = DEFAULT_OVERVIEW_CONTENT;
		expect(
			screen.getByRole('heading', { name: hero.title }),
		).toBeInTheDocument();
		expect(screen.getByText(hero.badgeLabel)).toBeInTheDocument();
		expect(screen.getByText(hero.badgeIcon)).toBeInTheDocument();
		expect(
			screen.getByText(hero.tokens?.game ?? 'Kingdom Builder'),
		).toBeInTheDocument();
	});

	it('renders supplied overview content using dynamic token fallbacks', () => {
		const registries = createSessionRegistries();
		const metadata = createDefaultRegistryMetadata();
		const [expandActionId] = registries.actions.keys();
		const [populationId] = registries.populations.keys();
		const resourceKeys = Object.keys(registries.resources);
		const statKeys = Object.keys(metadata.stats ?? {});
		const phaseKeys = Object.keys(metadata.phases ?? {});
		if (
			!expandActionId ||
			!populationId ||
			resourceKeys.length < 2 ||
			statKeys.length === 0 ||
			phaseKeys.length === 0
		) {
			throw new Error(
				'Expected default registry snapshot to contain baseline data.',
			);
		}
		const expandAction = registries.actions.get(expandActionId);
		const councilRole = registries.populations.get(populationId);
		const [goldKey, apKey] = resourceKeys;
		const statKey = statKeys[0];
		const phaseId = phaseKeys[0];
		metadata.passiveEvaluationModifiers =
			metadata.passiveEvaluationModifiers ?? {};
		metadata.resources = {
			...metadata.resources,
			[goldKey]: { label: 'Refined Gold', icon: '🪙' },
			[apKey]: { label: 'Reserve AP', icon: '✨' },
		};
		metadata.populations = {
			...metadata.populations,
			[populationId]: {
				label: 'Guiding Council',
				icon: councilRole.icon,
			},
		};
		metadata.stats = {
			...metadata.stats,
			[statKey]: { label: 'Army Strength', icon: '🛡️' },
		};
		metadata.phases = {
			...metadata.phases,
			[phaseId]: {
				...(metadata.phases?.[phaseId] ?? { id: phaseId }),
				label: 'Growth Phase',
				icon: '🌱',
				action: false,
				steps: [],
			},
		};
		metadata.assets = {
			...metadata.assets,
			land: { label: 'Land', icon: '🗺️' },
			slot: { label: 'Slot', icon: '🧩' },
		};

		const tokenConfig: OverviewTokenConfig = {
			actions: {
				[expandActionId]: ['missing-action', expandAction.id],
			},
			phases: {
				[phaseId]: ['missing-phase', phaseId],
			},
			resources: {
				[goldKey]: ['missing-gold', goldKey],
				[apKey]: ['missing-ap', apKey],
			},
			stats: {
				[statKey]: ['missing-army', statKey],
			},
			population: {
				[populationId]: ['missing-council', councilRole.id],
			},
		};

		const customContent: OverviewContentSection[] = [
			{
				kind: 'paragraph',
				id: 'custom-story',
				icon: 'land',
				title: 'Custom Story',
				span: true,
				paragraphs: [
					`Story {${goldKey}} keepers guard the realm.`,
					`Advisors {${populationId}} manage {${apKey}} to fuel plans.`,
				],
			},
			{
				kind: 'list',
				id: 'custom-flow',
				icon: 'growth',
				title: 'Custom Flow',
				items: [
					{
						icon: expandAction.id,
						label: 'Advance',
						body: [
							`Execute {${expandActionId}} during the {${phaseId}} sequence.`,
							`Strengthen {${statKey}} before moving out.`,
						],
					},
				],
			},
		];

		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<Overview
					onBack={vi.fn()}
					tokenConfig={tokenConfig}
					content={customContent}
				/>
			</RegistryMetadataProvider>,
		);

		expect(screen.queryByText('Your Objective')).not.toBeInTheDocument();

		const storySection = screen.getByText('Custom Story').closest('section');
		expect(storySection).not.toBeNull();
		if (!storySection) {
			return;
		}
		expect(storySection.textContent).not.toContain('{gold}');
		expect(storySection.textContent).not.toContain('{council}');
		expect(storySection.textContent).not.toContain('{ap}');

		expect(storySection).toHaveTextContent('🪙');
		expect(storySection).toHaveTextContent(councilRole.icon ?? '');
		expect(storySection).toHaveTextContent('✨');

		const flowSection = screen.getByText('Custom Flow').closest('section');
		expect(flowSection).not.toBeNull();
		if (!flowSection) {
			return;
		}
		expect(flowSection.textContent).not.toContain('{expand}');
		expect(flowSection.textContent).not.toContain('{growth}');
		expect(flowSection.textContent).not.toContain('{army}');

		expect(flowSection).toHaveTextContent(expandAction.icon ?? '');
		expect(flowSection).toHaveTextContent('🌱');
		expect(flowSection).toHaveTextContent('🛡️');

		expect(screen.getByText('Advance')).toBeInTheDocument();
	});
});
