/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ActionCard from '../../../src/components/actions/ActionCard';
import type { TranslationAssets } from '../../../src/translation/context';
import { createResourceV2Definition } from '@kingdom-builder/testing';
import { createResourceV2Selectors } from '../../../src/translation/resourceV2/selectors';

function createAssets(): TranslationAssets {
	const globalResource = createResourceV2Definition({
		id: 'resource.ap',
		name: 'Action Points',
		icon: '⚡️',
		order: 1,
		globalActionCost: 3,
	});
	const selectors = createResourceV2Selectors([globalResource], []);
	return {
		resources: {
			[globalResource.id]: { icon: '⚡️', label: 'Action Points' },
			gold: { icon: '🪙', label: 'Gold' },
		},
		populations: {},
		stats: {},
		population: { label: 'Population', icon: '👥' },
		land: { label: 'Land', icon: '🌍' },
		slot: { label: 'Slot', icon: '⬛️' },
		passive: { label: 'Passive', icon: '♾️' },
		transfer: { label: 'Transfer', icon: '🔁' },
		upkeep: { label: 'Upkeep', icon: '🛠️' },
		modifiers: {},
		triggers: {},
		tierSummaries: {},
		formatPassiveRemoval: (description: string) =>
			`Active as long as ${description}`,
		resourceV2: selectors,
	} satisfies TranslationAssets;
}

function renderCard(options: {
	costs: Record<string, number | undefined> | undefined;
	playerResources?: Record<string, number>;
	upkeep?: Record<string, number | undefined>;
}) {
	const assets = createAssets();
	render(
		<ActionCard
			title="Test"
			costs={options.costs}
			playerResources={options.playerResources ?? {}}
			actionCostResource="resource.ap"
			assets={assets}
			summary={undefined}
			implemented
			enabled
			tooltip={undefined}
			requirements={[]}
			requirementIcons={[]}
			onClick={() => {}}
			onMouseEnter={() => {}}
			onMouseLeave={() => {}}
			variant="front"
			multiStep={false}
			options={[]}
		/>,
	);
}

describe('Action cost summary rendering', () => {
	it('shows a base-only label when only the global cost applies', () => {
		renderCard({
			costs: { 'resource.ap': 3 },
			playerResources: { 'resource.ap': 5 },
		});
		expect(screen.getByText('No additional cost')).toBeInTheDocument();
	});

	it('shows delta adjustments when modifiers change the global cost', () => {
		renderCard({
			costs: { 'resource.ap': 5, gold: 2 },
			playerResources: { 'resource.ap': 4, gold: 3 },
		});
		const delta = screen.getByText('Δ ⚡️ +2');
		expect(delta).toBeInTheDocument();
		expect(delta).toHaveClass('text-red-500');
		expect(screen.getByText('🪙2')).toBeInTheDocument();
	});

	it('indicates suppressed hooks when the global cost is waived', () => {
		renderCard({
			costs: {},
			playerResources: { 'resource.ap': 1 },
		});
		expect(screen.getByText('Δ ⚡️ -3')).toBeInTheDocument();
	});
});
