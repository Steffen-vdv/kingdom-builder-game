/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { createContentFactory } from '@kingdom-builder/testing';
import { Registry, type ActionCategoryConfig } from '@kingdom-builder/protocol';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import Overview from '../src/Overview';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import type { SessionRegistries } from '../src/state/sessionRegistries';

describe('<Overview />', () => {
	it('renders supplied overview content using registry metadata tokens', () => {
		const factory = createContentFactory();
		const expandAction = factory.action({ id: 'expand', icon: '🚀' });
		const councilRole = factory.population({
			id: 'council',
			icon: '👑',
			name: 'Council',
		});
		const registries: SessionRegistries = {
			actions: factory.actions,
			actionCategories: new Registry<ActionCategoryConfig>(),
			buildings: factory.buildings,
			developments: factory.developments,
			populations: factory.populations,
			resources: {
				gold: {
					key: 'gold',
					label: 'Gold',
					icon: '🥇',
				},
				ap: {
					key: 'ap',
					label: 'Action Points',
					icon: '⚡',
				},
			},
		};
		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			resources: {
				gold: { label: 'Refined Gold', icon: '🪙' },
				ap: { label: 'Reserve AP', icon: '✨' },
			},
			populations: {
				[councilRole.id]: {
					label: 'Guiding Council',
					icon: councilRole.icon,
				},
			},
			buildings: {},
			developments: {},
			stats: {
				army: { label: 'Army Strength', icon: '🛡️' },
			},
			phases: {
				growth: {
					label: 'Growth Phase',
					icon: '🌱',
					action: false,
					steps: [],
				},
			},
			triggers: {},
			assets: {
				land: { label: 'Land', icon: '🗺️' },
				slot: { label: 'Slot', icon: '🧩' },
				passive: { label: 'Passive', icon: '✨' },
			},
			overview: {
				sections: [
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
				],
				tokens: {
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
					static: {
						land: ['land'],
						slot: ['slot'],
					},
				},
			},
		};

		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<Overview onBack={vi.fn()} />
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

	it('throws when rendered without registry metadata', () => {
		const renderOverview = () => {
			render(<Overview onBack={vi.fn()} />);
		};

		expect(renderOverview).toThrow(
			'useRegistryMetadata must be used within RegistryMetadataProvider',
		);
	});
});
