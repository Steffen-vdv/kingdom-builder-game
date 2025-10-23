/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';
import type { SessionRuleSnapshot } from '@kingdom-builder/protocol/session';
import { createTranslationAssets } from '../../../src/translation/context/assets';
import { deserializeSessionRegistries } from '../../../src/state/sessionRegistries';
import {
	createEmptySnapshotMetadata,
	createSnapshotPlayer,
} from '../../helpers/sessionFixtures';
import { ResourceHudView } from '../../../src/components/resources/ResourceHud';

function sanitize(id: string): string {
	return id.replace(/[^a-zA-Z0-9]/g, '_');
}

describe('<ResourceHudView />', () => {
	it('renders parent totals with grouped children in order', () => {
		const sibling = createResourceV2Definition({
			id: 'resource:sibling',
			name: 'Sibling',
			order: 1,
			group: { groupId: 'group:pair', order: 1 },
		});
		const child = createResourceV2Definition({
			id: 'resource:child',
			name: 'Child',
			order: 2,
			group: { groupId: 'group:pair', order: 2 },
		});
		const group = createResourceV2Group({
			id: 'group:pair',
			parentId: 'resource:parent',
			parentName: 'Parent Resource',
			parentOrder: 5,
			children: [sibling.id, child.id],
		});
		const registries = deserializeSessionRegistries({
			actions: {},
			buildings: {},
			developments: {},
			populations: {},
			resources: {},
			resourceDefinitions: [sibling, child],
			resourceGroups: [group],
		});
		const metadata = createEmptySnapshotMetadata({
			resources: {
				[sibling.id]: { label: 'Sibling' },
				[child.id]: { label: 'Child' },
				[group.parent.id]: { label: 'Parent Resource' },
			},
		});
		const ruleSnapshot: SessionRuleSnapshot = {
			tieredResourceKey: '',
			tierDefinitions: [],
			winConditions: [],
		};
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
				resourceDefinitions: registries.resourceDefinitions,
				resourceGroups: registries.resourceGroups,
			},
			metadata,
			{ rules: ruleSnapshot },
		);
		const player = createSnapshotPlayer({ id: 'A' });
		const parentAmount = 10;
		player.values = {
			[sibling.id]: {
				amount: 4,
				touched: true,
				parent: {
					id: group.parent.id,
					amount: parentAmount,
					touched: true,
				},
				recentGains: [],
			},
			[child.id]: {
				amount: 6,
				touched: true,
				parent: {
					id: group.parent.id,
					amount: parentAmount,
					touched: true,
				},
				recentGains: [],
			},
			[group.parent.id]: {
				amount: parentAmount,
				touched: true,
				recentGains: [],
			},
		};

		render(<ResourceHudView player={player} assets={assets} />);

		const parentTestId = `resource-parent-${sanitize(group.parent.id)}`;
		const parent = screen.getByTestId(parentTestId);
		const parentAmountNode = screen.getByTestId(
			`resource-amount-${sanitize(group.parent.id)}`,
		);
		expect(parentAmountNode).toHaveTextContent(String(parentAmount));

		const childNodes = parent.querySelectorAll(
			'[data-testid^="resource-child-"]',
		);
		expect(childNodes).toHaveLength(2);
		expect(childNodes[0]).toHaveAttribute(
			'data-testid',
			`resource-child-${sanitize(sibling.id)}`,
		);
		expect(childNodes[1]).toHaveAttribute(
			'data-testid',
			`resource-child-${sanitize(child.id)}`,
		);
	});

	it('formats percent resources and displays bounds/tier badges', () => {
		const percentResource = createResourceV2Definition({
			id: 'resource:percent',
			name: 'Percent Value',
			displayAsPercent: true,
			bounds: { lowerBound: 0, upperBound: 1 },
			tierTrack: {
				id: 'track:percent',
				tiers: [
					{
						id: 'tier.percent.low',
						range: { min: 0, max: 1 },
					},
				],
			},
		});
		const registries = deserializeSessionRegistries({
			actions: {},
			buildings: {},
			developments: {},
			populations: {},
			resources: {},
			resourceDefinitions: [percentResource],
			resourceGroups: [],
		});
		const metadata = createEmptySnapshotMetadata({
			resources: {
				[percentResource.id]: {
					label: 'Percent Value',
				},
			},
		});
		const ruleSnapshot: SessionRuleSnapshot = {
			tieredResourceKey: '',
			tierDefinitions: [],
			winConditions: [],
		};
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
				resourceDefinitions: registries.resourceDefinitions,
				resourceGroups: registries.resourceGroups,
			},
			metadata,
			{ rules: ruleSnapshot },
		);
		const player = createSnapshotPlayer({ id: 'A' });
		player.values = {
			[percentResource.id]: {
				amount: 0.5,
				touched: true,
				tier: {
					trackId: 'track:percent',
					tierId: 'tier.percent.low',
				},
				recentGains: [],
			},
		};

		render(<ResourceHudView player={player} assets={assets} />);

		const amountNode = screen.getByTestId(
			`resource-amount-${sanitize(percentResource.id)}`,
		);
		expect(amountNode).toHaveTextContent('50%');
		expect(screen.getByText('Bounds 0–1')).toBeInTheDocument();
		expect(screen.getByText('Tier tier.percent.low')).toBeInTheDocument();
	});

	it('omits untouched resources with zero values', () => {
		const definition = createResourceV2Definition({
			id: 'resource:hidden',
			name: 'Hidden',
		});
		const registries = deserializeSessionRegistries({
			actions: {},
			buildings: {},
			developments: {},
			populations: {},
			resources: {},
			resourceDefinitions: [definition],
			resourceGroups: [],
		});
		const metadata = createEmptySnapshotMetadata({
			resources: {
				[definition.id]: { label: 'Hidden' },
			},
		});
		const ruleSnapshot: SessionRuleSnapshot = {
			tieredResourceKey: '',
			tierDefinitions: [],
			winConditions: [],
		};
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
				resourceDefinitions: registries.resourceDefinitions,
				resourceGroups: registries.resourceGroups,
			},
			metadata,
			{ rules: ruleSnapshot },
		);
		const player = createSnapshotPlayer({ id: 'A' });
		player.values = {
			[definition.id]: {
				amount: 0,
				touched: false,
				recentGains: [],
			},
		};

		render(<ResourceHudView player={player} assets={assets} />);

		expect(
			screen.queryByTestId(`resource-standalone-${sanitize(definition.id)}`),
		).toBeNull();
	});
});
