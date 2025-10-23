/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import {
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';
import type { SessionResourceValueSnapshotMap } from '@kingdom-builder/protocol/session';
import { createResourceV2Selectors } from '../../../src/translation/resourceV2/selectors';
import { ResourceHud } from '../../../src/components/resources/ResourceHud';

describe('ResourceHud', () => {
	it('renders groups with parent totals, ordering, and hides untouched values', () => {
		const beta = createResourceV2Definition({
			id: 'resource:beta',
			name: 'Beta',
			order: 1,
			group: { groupId: 'group:pair', order: 1 },
		});
		const alpha = createResourceV2Definition({
			id: 'resource:alpha',
			name: 'Alpha',
			order: 2,
			group: { groupId: 'group:pair', order: 2 },
		});
		const solo = createResourceV2Definition({
			id: 'resource:solo',
			name: 'Solo',
			order: 3,
		});
		const hidden = createResourceV2Definition({
			id: 'resource:hidden',
			name: 'Hidden',
			order: 4,
		});
		const group = createResourceV2Group({
			id: 'group:pair',
			order: 1,
			parentId: 'parent:pair',
			parentName: 'Pair',
			children: [beta.id, alpha.id],
		});
		const selectors = createResourceV2Selectors(
			[beta, alpha, solo, hidden],
			[group],
		);
		const values: SessionResourceValueSnapshotMap = {
			[beta.id]: {
				amount: 4,
				touched: true,
				recentGains: [],
				parent: { id: group.parent.id, amount: 9, touched: true },
			},
			[alpha.id]: {
				amount: 5,
				touched: true,
				recentGains: [],
				parent: { id: group.parent.id, amount: 9, touched: true },
			},
			[group.parent.id]: {
				amount: 9,
				touched: true,
				recentGains: [],
			},
			[solo.id]: { amount: 7, touched: true, recentGains: [] },
			[hidden.id]: { amount: 0, touched: false, recentGains: [] },
		};
		render(<ResourceHud values={values} metadata={selectors} />);
		const rows = screen.getAllByTestId('resource-row');
		const ids = rows.map((row) => row.getAttribute('data-resource-id'));
		expect(ids).toEqual([group.parent.id, beta.id, alpha.id, solo.id]);
		const parentRow = rows[0]!;
		expect(within(parentRow).getByText('Pair')).toBeInTheDocument();
		expect(within(parentRow).getByText('9')).toBeInTheDocument();
		expect(screen.queryByText('Hidden')).toBeNull();
	});

	it('formats percent values and displays bound and tier badges', () => {
		const tiered = createResourceV2Definition({
			id: 'resource:tiered',
			name: 'Tiered',
			order: 1,
			displayAsPercent: true,
			bounds: { lowerBound: 0, upperBound: 100 },
			tierTrack: (track) =>
				track.tierWith('tier:steady', (tier) =>
					tier.range(0, 100).title('Steady'),
				),
		});
		const selectors = createResourceV2Selectors([tiered]);
		const values: SessionResourceValueSnapshotMap = {
			[tiered.id]: {
				amount: 25,
				touched: true,
				tier: { tierId: 'tier:steady' },
				recentGains: [],
			},
		};
		render(<ResourceHud values={values} metadata={selectors} />);
		const row = screen.getByTestId('resource-row');
		expect(row).toHaveTextContent('25%');
		expect(row).toHaveTextContent('Min 0');
		expect(row).toHaveTextContent('Max 100');
		expect(row).toHaveTextContent('Tier: Steady');
	});
});
