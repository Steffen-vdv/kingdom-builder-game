/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import Overview from '../src/Overview';
import * as RegistryMetadataContext from '../src/contexts/RegistryMetadataContext';
import type { SessionOverviewContent } from '@kingdom-builder/protocol/session';

describe('Overview content integration', () => {
	it('renders provided overview metadata using registry-driven tokens', () => {
		const scaffold = createTestSessionScaffold();
		const registries = scaffold.registries;
		const metadata = structuredClone(scaffold.metadata);
		const overviewContent = {
			hero: {
				badgeIcon: '🦁',
				badgeLabel: 'Lionheart Agenda',
				title: 'Lionheart Front',
				intro: 'Lead with {gold} resolve and {ap} tactics.',
				paragraph: 'Our {council} envoys safeguard the {castleHP} fortress.',
				tokens: {
					gold: 'Gold Reserve',
					ap: 'Action Surge',
					council: 'Council Envoys',
					castleHP: 'Stronghold',
				},
			},
			sections: [
				{
					kind: 'paragraph' as const,
					id: 'frontier',
					title: 'Frontier Briefing',
					icon: 'land',
					paragraphs: [
						'Chart {gold} prospects before the caravan departs.',
						'Rally {council} envoys and spend {ap} wisely.',
					],
				},
			],
			tokens: {
				resources: {
					gold: ['missing-gold', 'gold'],
					ap: ['missing-ap', 'ap'],
				},
				population: {
					council: ['missing-council', 'council'],
				},
				static: {
					land: ['land'],
					slot: ['slot'],
				},
			},
		} satisfies SessionOverviewContent;
		metadata.overviewContent = overviewContent;
		metadata.resources['gold'] = {
			label: 'Gold',
			icon: '🪙',
		};
		metadata.resources['ap'] = {
			label: 'Action Points',
			icon: '⚡',
		};
		metadata.populations['council'] = {
			label: 'Council',
			icon: '👑',
		};
		const tokenConfig = {
			resources: { gold: ['missing-gold', 'gold'], ap: ['missing-ap', 'ap'] },
			population: { council: ['missing-council', 'council'] },
		};
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<Overview onBack={vi.fn()} tokenConfig={tokenConfig} />
			</RegistryMetadataProvider>,
		);
		const section = screen.getByText('Frontier Briefing').closest('section');
		expect(section).not.toBeNull();
		if (!section) {
			return;
		}
		expect(section.textContent).not.toContain('{gold}');
		expect(section.textContent).not.toContain('{ap}');
		expect(section.textContent).not.toContain('{council}');
		expect(section).toHaveTextContent('🪙');
		expect(section).toHaveTextContent('⚡');
		expect(section).toHaveTextContent('👑');
	});

	it('renders fallback tokens when registry metadata is unavailable', () => {
		const scaffold = createTestSessionScaffold();
		const registries = scaffold.registries;
		const metadata = structuredClone(scaffold.metadata);
		const overviewContent = {
			hero: {
				badgeIcon: '🦅',
				badgeLabel: 'Sky Sentinels',
				title: 'Skyward Watch',
				intro: 'Guard the skies with {gold} tribute.',
				paragraph: 'Hold the {castleHP} citadel until reinforcements arrive.',
				tokens: {
					gold: 'Sky Tribute',
					castleHP: 'Citadel',
				},
			},
			sections: [
				{
					kind: 'paragraph' as const,
					id: 'skyline',
					title: 'Skyline Report',
					icon: 'slot',
					paragraphs: ['Rally {council} to fortify every tower.'],
				},
			],
			tokens: {
				resources: { gold: ['gold'] },
				population: { council: ['council'] },
				static: { castleHP: ['castleHP'] },
			},
		} satisfies SessionOverviewContent;
		metadata.overviewContent = overviewContent;
		const optionalSpy = vi.spyOn(
			RegistryMetadataContext,
			'useOptionalRegistryMetadata',
		);
		optionalSpy.mockReturnValue(null);
		try {
			render(
				<RegistryMetadataProvider registries={registries} metadata={metadata}>
					<Overview onBack={vi.fn()} />
				</RegistryMetadataProvider>,
			);
		} finally {
			optionalSpy.mockRestore();
		}
		const heroToken = screen.getByText('Sky Tribute', { selector: 'strong' });
		expect(heroToken).toBeInTheDocument();
		const citadelToken = screen.getByText('Citadel', { selector: 'strong' });
		expect(citadelToken).toBeInTheDocument();
		const councilToken = screen.getByText('council', { selector: 'strong' });
		expect(councilToken).toBeInTheDocument();
	});
});
