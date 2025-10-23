/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ActionCard from '../../../src/components/actions/ActionCard';
import { createDefaultTranslationAssets } from '../../helpers/translationAssets';
import { createResourceV2Definition } from '@kingdom-builder/testing';
import { createResourceV2Selectors } from '../../../src/translation/resourceV2/selectors';
import type { TranslationAssets } from '../../../src/translation/context';

describe('ActionCard cost rendering', () => {
	function createAssets(): TranslationAssets {
		const baseAssets = createDefaultTranslationAssets();
		const actionCostResource = 'resource.actionPoints';
		const oreResource = 'resource.ore';
		const definitions = [
			createResourceV2Definition({
				id: actionCostResource,
				name: 'Action Points',
				icon: '⚔️',
				globalActionCost: 1,
			}),
			createResourceV2Definition({
				id: oreResource,
				name: 'Ore',
				icon: '⛏️',
			}),
		];
		const resourceV2 = createResourceV2Selectors(definitions);
		return {
			...baseAssets,
			resources: {
				...baseAssets.resources,
				[actionCostResource]: { label: 'Action Points', icon: '⚔️' },
				[oreResource]: { label: 'Ore', icon: '⛏️' },
			},
			resourceV2,
		};
	}

	it('shows delta adjustments when modifiers increase the global cost', () => {
		const assets = createAssets();
		const actionCostResource = 'resource.actionPoints';
		const oreResource = 'resource.ore';
		render(
			<ActionCard
				title="Test Action"
				costs={{
					[actionCostResource]: 3,
					[oreResource]: 2,
				}}
				upkeep={{ [oreResource]: 1 }}
				playerResources={{
					[actionCostResource]: 5,
					[oreResource]: 5,
				}}
				actionCostResource={actionCostResource}
				enabled
				assets={assets}
			/>,
		);
		expect(
			screen.getByText('(1 ⚔️ Action Points each)', { exact: true }),
		).toBeInTheDocument();
		expect(screen.getByText('⚔️+2')).toBeInTheDocument();
		expect(screen.getByText('⛏️-2')).toBeInTheDocument();
		expect(screen.getByText('⛏️-1')).toBeInTheDocument();
	});

	it('renders discounts when suppressed hooks waive the global cost', () => {
		const assets = createAssets();
		const actionCostResource = 'resource.actionPoints';
		render(
			<ActionCard
				title="Suppressed Action"
				costs={{ [actionCostResource]: 0 }}
				playerResources={{ [actionCostResource]: 0 }}
				actionCostResource={actionCostResource}
				enabled
				assets={assets}
			/>,
		);
		expect(screen.getByText('⚔️-1')).toBeInTheDocument();
	});
});
