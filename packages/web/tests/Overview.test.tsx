/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import Overview, { type OverviewTokenConfig } from '../src/Overview';
import type { OverviewContentSection } from '../src/components/overview/sectionsData';
import {
	ACTIONS,
	PHASES,
	RESOURCES,
	POPULATION_ROLES,
	STATS,
	PhaseId,
} from '@kingdom-builder/contents';

describe('<Overview />', () => {
	it('renders supplied overview content using dynamic token fallbacks', () => {
		const actionEntries = Array.from(
			(
				ACTIONS as unknown as {
					map: Map<string, { icon?: React.ReactNode }>;
				}
			).map.entries(),
		);
		const [fallbackActionId, fallbackActionDef] = actionEntries[0]!;

		const [fallbackPhase] = PHASES;

		const resourceEntries = Object.entries(RESOURCES) as Array<
			[string, { icon?: React.ReactNode }]
		>;
		const [fallbackGoldKey, fallbackGoldDef] = resourceEntries[0]!;
		const [fallbackApKey, fallbackApDef] =
			resourceEntries[1] ?? resourceEntries[0]!;

		const statEntries = Object.entries(STATS) as Array<
			[string, { icon?: React.ReactNode }]
		>;
		const [fallbackStatKey, fallbackStatDef] = statEntries[0]!;

		const populationEntries = Object.entries(POPULATION_ROLES) as Array<
			[string, { icon?: React.ReactNode }]
		>;
		const [fallbackPopulationKey, fallbackPopulationDef] =
			populationEntries[0]!;

		const growthToken = `{${PhaseId.Growth}}`;

		const tokenConfig: OverviewTokenConfig = {
			actions: {
				expand: ['missing-action', fallbackActionId],
			},
			phases: {
				[PhaseId.Growth]: ['missing-phase', fallbackPhase.id],
			},
			resources: {
				gold: ['missing-gold', fallbackGoldKey],
				ap: ['missing-ap', fallbackApKey],
			},
			stats: {
				army: ['missing-army', fallbackStatKey],
			},
			population: {
				council: ['missing-council', fallbackPopulationKey],
			},
		};

		const customContent: OverviewContentSection[] = [
			{
				kind: 'paragraph',
				id: 'custom-story',
				icon: 'castle',
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
				icon: PhaseId.Growth,
				title: 'Custom Flow',
				items: [
					{
						icon: 'expand',
						label: 'Advance',
						body: [
							`Execute {expand} during the ${growthToken} sequence.`,
							'Strengthen {army} before moving out.',
						],
					},
				],
			},
		];

		render(
			<Overview
				onBack={vi.fn()}
				tokenConfig={tokenConfig}
				content={customContent}
			/>,
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

		if (typeof fallbackGoldDef.icon === 'string') {
			expect(storySection).toHaveTextContent(fallbackGoldDef.icon);
		}
		if (typeof fallbackPopulationDef.icon === 'string') {
			expect(storySection).toHaveTextContent(fallbackPopulationDef.icon);
		}
		if (typeof fallbackApDef.icon === 'string') {
			expect(storySection).toHaveTextContent(fallbackApDef.icon);
		}

		const flowSection = screen.getByText('Custom Flow').closest('section');
		expect(flowSection).not.toBeNull();
		if (!flowSection) {
			return;
		}
		expect(flowSection.textContent).not.toContain('{expand}');
		expect(flowSection.textContent).not.toContain(growthToken);
		expect(flowSection.textContent).not.toContain('{army}');

		if (typeof fallbackActionDef.icon === 'string') {
			expect(flowSection).toHaveTextContent(fallbackActionDef.icon);
		}
		if (typeof fallbackPhase?.icon === 'string') {
			expect(flowSection).toHaveTextContent(fallbackPhase.icon);
		}
		if (typeof fallbackStatDef.icon === 'string') {
			expect(flowSection).toHaveTextContent(fallbackStatDef.icon);
		}

		expect(screen.getByText('Advance')).toBeInTheDocument();
	});
});
