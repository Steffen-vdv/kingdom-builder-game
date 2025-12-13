/**
 * Test to verify that changePercent properly converts whole percentages
 * to decimals.
 *
 * Bug: changePercent(25) should create modifiers: [0.25], not [25].
 * The delta calculation uses modifiers * currentValue, so:
 * - Correct: 0.25 * 100 = 25 gold (25%)
 * - Bug: 25 * 100 = 2500 gold (2500%!)
 */
import { describe, it, expect } from 'vitest';
import {
	createActionRegistry,
	Resource,
	ActionId,
} from '@kingdom-builder/contents';

// Use ActionId constant instead of hardcoding
const PLUNDER_ACTION_ID = ActionId.plunder;

describe('transfer percent conversion bug', () => {
	it('Plunder action should use decimal modifiers, not whole percentages', () => {
		// Get the actual Plunder action from the registry
		const actionRegistry = createActionRegistry();
		const plunderAction = actionRegistry.get(PLUNDER_ACTION_ID);
		expect(plunderAction).toBeDefined();

		console.log(
			'Plunder action effects:',
			JSON.stringify(plunderAction!.effects, null, 2),
		);

		// Find the gold transfer effect (25% transfer)
		const goldTransferEffect = plunderAction!.effects?.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'transfer' &&
				effect.params?.donor?.resourceId === Resource.gold,
		);

		expect(goldTransferEffect).toBeDefined();
		console.log(
			'Gold transfer effect:',
			JSON.stringify(goldTransferEffect, null, 2),
		);

		// Check the donor modifiers
		const donorChange = goldTransferEffect!.params?.donor?.change;
		if (donorChange?.type === 'percent') {
			const modifiers = donorChange.modifiers;
			console.log('Donor modifiers:', modifiers);

			// BUG CHECK: If modifiers[0] is -25 instead of -0.25, that's the bug!
			const modifier = modifiers[0];
			if (Math.abs(modifier) > 1) {
				console.error(
					`BUG DETECTED: changePercent stores whole percentage (${modifier}) instead of decimal (${modifier / 100})`,
				);
				console.error('This causes 100x too much gold to be transferred!');
			}

			// Expected: -0.25 for 25% removal
			// Bug: -25 (100x too large)
			expect(modifier).toBe(-0.25);
		}

		// Check the recipient modifiers
		const recipientChange = goldTransferEffect!.params?.recipient?.change;
		if (recipientChange?.type === 'percent') {
			const modifiers = recipientChange.modifiers;
			console.log('Recipient modifiers:', modifiers);

			// Expected: 0.25 for 25% addition
			// Bug: 25 (100x too large)
			expect(modifiers[0]).toBe(0.25);
		}
	});
});
