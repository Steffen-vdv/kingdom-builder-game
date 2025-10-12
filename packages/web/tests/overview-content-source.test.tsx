/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { createContentFactory } from '@kingdom-builder/testing';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../src/state/sessionRegistries';
import Overview from '../src/Overview';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';

describe('Overview content integration', () => {
	it('consumes provided overview metadata from the registry context', () => {
		const factory = createContentFactory();
		const registries: SessionRegistries = {
			actions: factory.actions,
			buildings: factory.buildings,
			developments: factory.developments,
			populations: factory.populations,
			resources: {
				gold: { key: 'gold', label: 'Gold', icon: '🪙' },
				ap: { key: 'ap', label: 'Action Points', icon: '✨' },
				castleHP: {
					key: 'castleHP',
					label: 'Castle HP',
					icon: '🏰',
				},
				happiness: {
					key: 'happiness',
					label: 'Happiness',
					icon: '😊',
				},
			},
		};
		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			resources: {
				gold: { label: 'Gold', icon: '🪙' },
				ap: { label: 'AP', icon: '✨' },
				castleHP: { label: 'Castle HP', icon: '🏰' },
				happiness: { label: 'Happiness', icon: '😊' },
			},
			populations: {},
			buildings: {},
			developments: {},
			stats: {},
			phases: {
				growth: { label: 'Growth', icon: '🌱', action: false, steps: [] },
			},
			triggers: {},
			assets: {
				land: { label: 'Land', icon: '🗺️' },
				slot: { label: 'Slot', icon: '🧩' },
				passive: { label: 'Passive', icon: '♾️' },
				upkeep: { label: 'Upkeep', icon: '🧹' },
				modifiers: {},
				triggers: {},
				tierSummaries: {},
			},
		};
		const overviewContent = {
			hero: {
				badgeIcon: '🧭',
				badgeLabel: 'Scout The Wilds',
				title: 'Frontier Briefing',
				intro: 'Chart {gold} prospects before the caravan departs.',
				paragraph: 'Rally {council} envoys and {expand} into unclaimed wilds.',
				tokens: {
					game: 'Frontier Duel',
				},
			},
			tokens: {
				actions: { expand: ['expand'] },
				phases: { growth: ['growth'] },
				resources: {
					gold: ['gold'],
					ap: ['ap'],
				},
				stats: {},
				population: { council: ['council'] },
			},
			sections: [
				{
					kind: 'paragraph' as const,
					id: 'scouting',
					icon: 'growth',
					title: 'Scouting Notes',
					paragraphs: [
						'Secure {land} footholds and guard your {castleHP} borders.',
						'Keep {happiness} high to fuel {ap} ambitions.',
					],
				},
			],
		} as const;

		render(
			<RegistryMetadataProvider
				registries={registries}
				metadata={metadata}
				overviewContent={overviewContent}
			>
				<Overview onBack={vi.fn()} />
			</RegistryMetadataProvider>,
		);

		expect(screen.getByText('Frontier Briefing')).toBeInTheDocument();
		expect(screen.getByText('Scout The Wilds')).toBeInTheDocument();

		const intro = screen.getByText(/Chart/);
		expect(intro.textContent).not.toContain('{');
		const paragraph = screen.getByText(/Rally/);
		expect(paragraph.textContent).not.toContain('{');

		const scoutingSection = screen
			.getByText('Scouting Notes')
			.closest('section');
		expect(scoutingSection).not.toBeNull();
		if (scoutingSection) {
			expect(scoutingSection.textContent).not.toContain('{');
		}
	});
});
