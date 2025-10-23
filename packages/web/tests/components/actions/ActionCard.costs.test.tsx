/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ActionCard from '../../../src/components/actions/ActionCard';
import { createResourceV2Definition } from '@kingdom-builder/testing';
import { createResourceV2Selectors } from '../../../src/translation/resourceV2/selectors';
import type { TranslationAssets } from '../../../src/translation/context/types';

type AssetSetup = {
	assets: TranslationAssets;
	primary: string;
	secondary: string;
};

function createActionCostAssets(globalAmount = 2): AssetSetup {
	const actionPoint = createResourceV2Definition({
		id: 'resource.actionPoint',
		name: 'Action Points',
		icon: '⚡',
		globalActionCost: globalAmount,
	});
	const ore = createResourceV2Definition({
		id: 'resource.ore',
		name: 'Ore',
		icon: '⛏️',
	});
	const selectors = createResourceV2Selectors([actionPoint, ore]);
	const actionPointLabel = actionPoint.display?.name ?? actionPoint.id;
	const actionPointIcon = actionPoint.display?.icon;
	const oreLabel = ore.display?.name ?? ore.id;
	const oreIcon = ore.display?.icon;
	const assets: TranslationAssets = {
		resources: {
			[actionPoint.id]: {
				label: actionPointLabel,
				icon: actionPointIcon,
			},
			[ore.id]: {
				label: oreLabel,
				icon: oreIcon,
			},
		},
		stats: {},
		populations: {},
		population: {},
		land: {},
		slot: {},
		passive: {},
		transfer: {},
		upkeep: { label: 'Upkeep', icon: '🧾' },
		modifiers: {},
		triggers: {},
		tierSummaries: {},
		formatPassiveRemoval: (description: string) =>
			`Active as long as ${description}`,
		resourceV2: selectors,
	};
	return {
		assets,
		primary: actionPoint.id,
		secondary: ore.id,
	};
}

describe('ActionCard cost summary', () => {
	it('renders global cost deltas when modifiers increase the primary cost', () => {
		const { assets, primary, secondary } = createActionCostAssets(2);
		render(
			<ActionCard
				title="Test Action"
				costs={{ [primary]: 4, [secondary]: 3 }}
				playerResources={{
					[primary]: 5,
					[secondary]: 5,
				}}
				actionCostResource={primary}
				summary={[]}
				enabled
				implemented
				assets={assets}
			/>,
		);
		const headerLabel = screen.getByText(/\(2 ⚡ Action Points each\)/);
		expect(headerLabel).toBeInTheDocument();
		expect(screen.getByText('⚡+2')).toBeInTheDocument();
		expect(screen.getByText('⛏️3')).toBeInTheDocument();
	});

	it('displays discount deltas when modifiers reduce the primary cost', () => {
		const { assets, primary } = createActionCostAssets(2);
		render(
			<ActionCard
				title="Discount Action"
				costs={{ [primary]: 1 }}
				playerResources={{ [primary]: 5 }}
				actionCostResource={primary}
				summary={[]}
				enabled
				implemented
				assets={assets}
			/>,
		);
		const discountHeader = screen.getByText(/\(2 ⚡ Action Points each\)/);
		expect(discountHeader).toBeInTheDocument();
		expect(screen.getByText('⚡-1')).toBeInTheDocument();
	});

	it('omits deltas when suppression keeps the baseline cost', () => {
		const { assets, primary } = createActionCostAssets(2);
		render(
			<ActionCard
				title="Baseline Action"
				costs={{ [primary]: 2 }}
				playerResources={{ [primary]: 5 }}
				actionCostResource={primary}
				summary={[]}
				enabled
				implemented
				assets={assets}
			/>,
		);
		const freeLabel = screen.getByText('Free');
		expect(freeLabel).toBeInTheDocument();
		expect(screen.queryByText(/⚡\+/)).not.toBeInTheDocument();
		expect(screen.queryByText(/⚡-/)).not.toBeInTheDocument();
	});
});
