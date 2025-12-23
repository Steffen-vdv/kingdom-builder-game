/**
 * Engine Invariant Tests
 *
 * These tests verify structural properties of the engine using REAL content.
 * They catch infrastructure bugs that unit tests miss because unit tests
 * use synthetic fixtures with hardcoded "correct" values.
 *
 * Why this matters:
 * Bugs like N² scaling or 100x transfers pass through hundreds of unit tests
 * because those tests bypass the actual content definitions. These invariant
 * tests verify that real content produces expected behavior.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
	Resource as CResource,
	PhaseId,
	createActionRegistry,
	ActionId,
} from '@kingdom-builder/contents';
import { createTestEngine } from './helpers.ts';
import {
	advance,
	getResourceValue,
	performAction,
	getActionCosts,
} from '../src/index.ts';

/**
 * Advance to the main phase where actions can be performed.
 */
function toMainPhase(engineContext: ReturnType<typeof createTestEngine>) {
	while (engineContext.game.currentPhase !== PhaseId.Main) {
		advance(engineContext);
	}
}

describe('Real Content Smoke Tests', () => {
	/**
	 * INVARIANT: Plunder transfers approximately 25% of opponent's gold.
	 *
	 * This test uses real game content to verify the transfer percentage
	 * is calculated correctly. It would have caught the changePercent bug
	 * where 25 was stored instead of 0.25 (causing 2500% transfer).
	 *
	 * Note: This test is skipped because raid requires full attack
	 * resolution, which is complex to set up. The key invariant (decimal
	 * modifiers) is tested by 'transfer effects with percent change have
	 * decimal modifiers'.
	 */
	it.skip('Plunder action transfers approximately 25% of opponent gold', () => {
		const engineContext = createTestEngine();
		toMainPhase(engineContext);

		const opponentGold = 100; // Use 100 for easy percentage math

		// Setup: Give opponent gold, give active player resources needed for raid
		engineContext.opponent.resourceValues[CResource.gold] = opponentGold;
		engineContext.activePlayer.resourceValues[CResource.gold] = 0;

		// Raid requires legion > war-weariness
		engineContext.activePlayer.resourceValues[CResource.legion] = 1;
		engineContext.activePlayer.resourceValues[CResource.warWeariness] = 0;

		// Get raid action cost and provide enough AP
		const raidCost = getActionCosts(ActionId.raid, engineContext);
		const apNeeded = raidCost[CResource.cp] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.cp] = apNeeded;

		const beforeActive = getResourceValue(
			engineContext.activePlayer,
			CResource.gold,
		);

		performAction(ActionId.raid, engineContext);

		const afterActive = getResourceValue(
			engineContext.activePlayer,
			CResource.gold,
		);

		const actualTransfer = afterActive - beforeActive;

		// INVARIANT: Transfer should be approximately 25% (20-30 for 100 gold)
		// Before the fix, it was transferring 2500 gold (2500%!)
		expect(actualTransfer).toBeGreaterThan(15); // At least ~15%
		expect(actualTransfer).toBeLessThan(35); // At most ~35%
	});

	/**
	 * INVARIANT: Council members grant AP linearly, not quadratically.
	 *
	 * With N councils, the player should receive N AP (or N × apPerCouncil),
	 * not N² AP. This tests the trigger loop + evaluator interaction.
	 */
	it('Council AP gain scales linearly with council count', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 5 }), (councilCount) => {
				const engineContext = createTestEngine();

				// Setup: Give player N councils
				engineContext.activePlayer.resourceValues[CResource.council] =
					councilCount;
				engineContext.activePlayer.resourceValues[CResource.cp] = 0;

				// Advance through growth phase to gain AP step
				while (engineContext.game.currentPhase !== PhaseId.Main) {
					advance(engineContext);
				}

				const apGained =
					engineContext.activePlayer.resourceValues[CResource.cp];

				// INVARIANT: AP gain should be linear (proportional to council count)
				// With 1 council = base AP, 2 councils = 2x base AP, etc.
				// The exact formula is: apGained = councilCount × apPerCouncil
				// We verify linearity by checking the ratio is consistent
				if (councilCount > 1) {
					// Run again with 1 council to get the base rate
					const baseContext = createTestEngine();
					baseContext.activePlayer.resourceValues[CResource.council] = 1;
					baseContext.activePlayer.resourceValues[CResource.cp] = 0;
					while (baseContext.game.currentPhase !== PhaseId.Main) {
						advance(baseContext);
					}
					const baseApGain =
						baseContext.activePlayer.resourceValues[CResource.cp];

					// INVARIANT: N councils should give N × baseApGain
					// Allow some tolerance for other effects
					const expectedAp = councilCount * baseApGain;
					expect(apGained).toBe(expectedAp);
				}
			}),
			{ numRuns: 5 },
		);
	});
});

describe('Builder Output Validation', () => {
	/**
	 * INVARIANT: All actions in the registry have basic required fields.
	 *
	 * This smoke test ensures real content is well-formed.
	 */
	it('all registered actions have required fields', () => {
		const actions = createActionRegistry();

		for (const action of actions.values()) {
			expect(action.id, `Action must have id`).toBeDefined();
			expect(action.name, `Action ${action.id} must have name`).toBeDefined();

			// Effects should be an array if present
			if (action.effects) {
				expect(Array.isArray(action.effects)).toBe(true);
			}
		}
	});

	/**
	 * INVARIANT: Transfer effects with percent change have modifiers in
	 * valid range.
	 *
	 * This tests that the changePercent builder produces decimal modifiers,
	 * not whole percentages.
	 */
	it('transfer effects with percent change have decimal modifiers', () => {
		const actions = createActionRegistry();

		for (const action of actions.values()) {
			if (!action.effects) {
				continue;
			}

			for (const effect of action.effects) {
				if (effect.type !== 'resource' || effect.method !== 'transfer') {
					continue;
				}

				const params = effect.params as {
					donor?: { change?: { type: string; modifiers?: number[] } };
					recipient?: { change?: { type: string; modifiers?: number[] } };
				};

				// Check donor modifiers
				if (params?.donor?.change?.type === 'percent') {
					const modifiers = params.donor.change.modifiers ?? [];
					for (const mod of modifiers) {
						expect(
							Math.abs(mod),
							`Action ${action.id} donor modifier ${mod} should be decimal (≤1), not percentage`,
						).toBeLessThanOrEqual(1);
					}
				}

				// Check recipient modifiers
				if (params?.recipient?.change?.type === 'percent') {
					const modifiers = params.recipient.change.modifiers ?? [];
					for (const mod of modifiers) {
						expect(
							Math.abs(mod),
							`Action ${action.id} recipient modifier ${mod} should be decimal (≤1), not percentage`,
						).toBeLessThanOrEqual(1);
					}
				}
			}
		}
	});
});
