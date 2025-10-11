/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { createContentFactory } from '@kingdom-builder/testing';
import type { SessionRegistries } from '../src/state/sessionRegistries';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import type * as OverviewDefaultModule from '../src/components/overview/defaultContent';

function createTestEnvironment(): {
	registries: SessionRegistries;
	metadata: SessionSnapshotMetadata;
} {
	const factory = createContentFactory();
	factory.action({ id: 'expand', icon: '⚔️', name: 'Expand' });
	factory.population({ id: 'council', icon: '👑', name: 'Council' });

	const registries: SessionRegistries = {
		actions: factory.actions,
		buildings: factory.buildings,
		developments: factory.developments,
		populations: factory.populations,
		resources: {
			gold: { key: 'gold', icon: '💰', label: 'Gold' },
			ap: { key: 'ap', icon: '⚡', label: 'Action Points' },
			castleHP: { key: 'castleHP', icon: '🏰', label: 'Castle HP' },
			happiness: { key: 'happiness', icon: '🎉', label: 'Happiness' },
		},
	};

	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		actions: {
			expand: { label: 'Expand', icon: '⚔️' },
		},
		resources: {
			gold: { label: 'Gold', icon: '💰' },
			ap: { label: 'Action Points', icon: '⚡' },
			castleHP: { label: 'Castle HP', icon: '🏰' },
			happiness: { label: 'Happiness', icon: '🎉' },
		},
		populations: {
			council: { label: 'Council', icon: '👑' },
		},
		stats: {},
		phases: {
			growth: { label: 'Growth', icon: '🌱', action: true, steps: [] },
		},
		assets: {
			land: { label: 'Land', icon: '🗺️' },
			slot: { label: 'Slot', icon: '📦' },
		},
	};

	return { registries, metadata };
}

describe('Overview content integration', () => {
	it('consumes swapped overview metadata from the content source module', async () => {
		vi.resetModules();

		const actual = await vi.importActual<typeof OverviewDefaultModule>(
			'../src/components/overview/defaultContent',
		);

		vi.doMock('../src/components/overview/defaultContent', () => ({
			...actual,
			DEFAULT_OVERVIEW_HERO: {
				badgeIcon: '🧭',
				badgeLabel: 'Scout The Wilds',
				title: 'Frontier Briefing',
				intro: 'Chart {gold} prospects before the caravan departs.',
				paragraph: 'Rally {council} envoys and {expand} into unclaimed wilds.',
				tokens: {
					game: 'Frontier Duel',
				},
			},
			DEFAULT_OVERVIEW_TOKENS: actual.DEFAULT_OVERVIEW_TOKENS,
			DEFAULT_OVERVIEW_SECTIONS: [
				{
					kind: 'paragraph',
					id: 'scouting',
					icon: 'growth',
					title: 'Scouting Notes',
					paragraphs: [
						'Secure {land} footholds and guard your {castleHP} borders.',
						'Keep {happiness} high to fuel {ap} ambitions.',
					],
				},
			],
		}));

		const { RegistryMetadataProvider } = await import(
			'../src/contexts/RegistryMetadataContext'
		);
		const { default: Overview } = await import('../src/Overview');
		const { registries, metadata } = createTestEnvironment();

		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
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

		vi.doUnmock('../src/components/overview/defaultContent');
		vi.resetModules();
	});
});
