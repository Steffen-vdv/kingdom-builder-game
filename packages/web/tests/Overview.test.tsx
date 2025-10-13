/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import Overview, { type OverviewTokenConfig } from '../src/Overview';
import { DEFAULT_OVERVIEW_CONTENT } from '../src/contexts/defaultRegistryMetadata';
import type { OverviewContentSection } from '../src/components/overview/sectionsData';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import { createSessionRegistries } from './helpers/sessionRegistries';
import { createDefaultRegistryMetadata } from './helpers/defaultRegistrySnapshot';

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
                const expandAction = registries.actions.get('expand');
                const councilRole = registries.populations.get('council');
                if (!expandAction || !councilRole) {
                        throw new Error('Expected default registries to expose expand and council entries.');
                }
                registries.actions.add(expandAction.id, { ...expandAction, icon: '🚀' });
                const metadata = createDefaultRegistryMetadata();
                metadata.resources = {
                        ...metadata.resources,
                        gold: { ...metadata.resources?.gold, label: 'Refined Gold', icon: '🪙' },
                        ap: { ...metadata.resources?.ap, label: 'Reserve AP', icon: '✨' },
                };
                metadata.populations = {
                        ...metadata.populations,
                        [councilRole.id]: {
                                label: 'Guiding Council',
                                icon: councilRole.icon,
                        },
                };
                metadata.stats = {
                        ...metadata.stats,
                        armyStrength: {
                                ...metadata.stats?.armyStrength,
                                label: 'Army Strength',
                                icon: '🛡️',
                        },
                        army: {
                                label: 'Army Strength',
                                icon: '🛡️',
                        },
                };
                metadata.phases = {
                        ...metadata.phases,
                        growth: {
                                ...(metadata.phases?.growth ?? { id: 'growth', label: 'Growth', steps: [] }),
                                label: 'Growth Phase',
                                icon: '🌱',
                        },
                };
                metadata.assets = {
                        ...metadata.assets,
                        land: { ...metadata.assets?.land, label: 'Land', icon: '🗺️' },
                        slot: { ...metadata.assets?.slot, label: 'Slot', icon: '🧩' },
                };

                const tokenConfig: OverviewTokenConfig = {
                        actions: {
                                expand: ['missing-action', expandAction.id],
                        },
			phases: {
				growth: ['missing-phase', 'growth'],
			},
			resources: {
				gold: ['missing-gold', 'gold'],
				ap: ['missing-ap', 'ap'],
			},
                        stats: {
                                army: ['missing-army', 'army'],
                        },
			population: {
				council: ['missing-council', councilRole.id],
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
					'Story {gold} keepers guard the realm.',
					'Advisors {council} manage {ap} to fuel plans.',
				],
			},
			{
				kind: 'list',
				id: 'custom-flow',
				icon: 'growth',
				title: 'Custom Flow',
				items: [
					{
						icon: 'expand',
						label: 'Advance',
						body: [
							'Execute {expand} during the {growth} sequence.',
							'Strengthen {army} before moving out.',
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
