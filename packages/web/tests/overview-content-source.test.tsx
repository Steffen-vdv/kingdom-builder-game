/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import type * as ContentsModule from '@kingdom-builder/contents';

describe('Overview content integration', () => {
	it('consumes swapped overview metadata from the content package', async () => {
		vi.resetModules();

		const actual = await vi.importActual<ContentsModule>(
			'@kingdom-builder/contents',
		);

		vi.doMock('@kingdom-builder/contents', () => ({
			...actual,
			OVERVIEW_CONTENT: {
				hero: {
					badgeIcon: '🧭',
					badgeLabel: 'Scout The Wilds',
					title: 'Frontier Briefing',
					intro: 'Chart {gold} prospects before the caravan departs.',
					paragraph:
						'Rally {council} envoys and {expand} into unclaimed wilds.',
					tokens: {
						game: 'Frontier Duel',
					},
				},
				tokens: actual.OVERVIEW_CONTENT.tokens,
				sections: [
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
			},
		}));

		const { default: Overview } = await import('../src/Overview');

		render(<Overview onBack={vi.fn()} />);

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

		vi.doUnmock('@kingdom-builder/contents');
		vi.resetModules();
	});
});
