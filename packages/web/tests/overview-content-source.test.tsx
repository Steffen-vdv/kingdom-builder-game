/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import Overview from '../src/Overview';

describe('Overview content integration', () => {
	it('renders provided overview metadata using registry-driven tokens', () => {
		const scaffold = createTestSessionScaffold();
		const registries = scaffold.registries;
		const metadata = structuredClone(scaffold.metadata);
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
		metadata.overviewContent = {
			tokens: {
				resources: { gold: ['gold'], ap: ['ap'] },
				population: { council: ['council'] },
				static: { land: ['land'], slot: ['slot'] },
			},
		};
		const overviewContent = [
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
		];
		const tokenConfig = {
			resources: { gold: ['missing-gold', 'gold'], ap: ['missing-ap', 'ap'] },
			population: { council: ['missing-council', 'council'] },
		};
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<Overview
					onBack={vi.fn()}
					tokenConfig={tokenConfig}
					content={overviewContent}
				/>
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
});
