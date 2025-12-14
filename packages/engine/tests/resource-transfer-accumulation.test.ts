/**
 * Test to investigate resource transfer accumulation bug.
 *
 * Bug: When running Plunder (25% gold transfer), way more than 25% is taken.
 * With 100 gold, 2400 is transferred instead of 25.
 * The problem gets worse over multiple turns/raids.
 *
 * This test attempts to reproduce the bug by running multiple transfer effects
 * and checking if the modifiers array accumulates.
 */
import { describe, it, expect } from 'vitest';
import { runEffects } from '../src/effects';
import { createTestEngine } from './helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import type { EffectDef } from '@kingdom-builder/protocol';
import { Resource } from '@kingdom-builder/contents';

interface TransferEffectParams {
	donor: {
		player?: string;
		resourceId: string;
		change: {
			type: 'percent';
			modifiers: number[];
			roundingMode?: string;
		};
	};
	recipient: {
		player?: string;
		resourceId: string;
		change: {
			type: 'percent';
			modifiers: number[];
		};
	};
}

describe('resource transfer accumulation bug investigation', () => {
	/**
	 * Creates a transfer effect similar to Plunder.
	 * Uses percent for both donor and recipient (matching actual Plunder config).
	 * @param percent The percentage to transfer (e.g., 25 for 25%)
	 */
	function createTransferEffect(
		percent: number,
	): EffectDef<TransferEffectParams> {
		const decimalPercent = percent / 100; // Convert 25 to 0.25
		return {
			type: 'resource',
			method: 'transfer',
			params: {
				donor: {
					player: 'opponent',
					resourceId: Resource.gold,
					change: {
						type: 'percent',
						modifiers: [-decimalPercent], // -0.25 for 25% removal
					},
				},
				recipient: {
					player: 'active',
					resourceId: Resource.gold,
					change: {
						type: 'percent',
						modifiers: [decimalPercent], // +0.25 for 25% addition
					},
				},
			},
		};
	}

	it('transfers correct percentage on first run', () => {
		const content = createContentFactory();
		const engine = createTestEngine(content);

		// Set up: opponent has 100 gold, active has 100 gold
		// (active needs gold for percent-based recipient to work)
		engine.opponent.resourceValues[Resource.gold] = 100;
		engine.activePlayer.resourceValues[Resource.gold] = 100;

		const effect = createTransferEffect(25);

		// Log the modifiers array before transfer
		const modifiersBefore = [...effect.params!.donor.change.modifiers];
		console.log('Modifiers before transfer:', modifiersBefore);

		runEffects([effect], engine);

		// Log the modifiers array after transfer
		const modifiersAfter = effect.params!.donor.change.modifiers;
		console.log('Modifiers after transfer:', modifiersAfter);
		console.log(
			'Opponent gold after:',
			engine.opponent.resourceValues[Resource.gold],
		);
		console.log(
			'Active gold after:',
			engine.activePlayer.resourceValues[Resource.gold],
		);

		// Transfer: min(donor 25%, recipient 25%) = min(25, 25) = 25
		expect(engine.opponent.resourceValues[Resource.gold]).toBe(75);
		expect(engine.activePlayer.resourceValues[Resource.gold]).toBe(125);

		// Modifiers array should NOT have changed
		expect(modifiersAfter).toEqual(modifiersBefore);
		expect(modifiersAfter.length).toBe(1);
	});

	it('transfers correct percentage on multiple consecutive runs', () => {
		const content = createContentFactory();
		const engine = createTestEngine(content);

		// Create ONE effect definition and reuse it (like the game does)
		const effect = createTransferEffect(25);

		// Run the same effect multiple times
		for (let i = 0; i < 5; i++) {
			// Reset gold for each iteration (both players need gold)
			engine.opponent.resourceValues[Resource.gold] = 100;
			engine.activePlayer.resourceValues[Resource.gold] = 100;

			runEffects([effect], engine);

			console.log(`Run ${i + 1}:`);
			console.log('  Modifiers:', effect.params!.donor.change.modifiers);
			console.log(
				'  Opponent gold:',
				engine.opponent.resourceValues[Resource.gold],
			);
			console.log(
				'  Active gold:',
				engine.activePlayer.resourceValues[Resource.gold],
			);

			// Each run should transfer 25 gold
			expect(engine.opponent.resourceValues[Resource.gold]).toBe(75);
			expect(engine.activePlayer.resourceValues[Resource.gold]).toBe(125);
		}

		// Modifiers should still have exactly 1 entry
		expect(effect.params!.donor.change.modifiers.length).toBe(1);
	});

	it('does not accumulate modifiers across game turns', () => {
		const content = createContentFactory();
		const engine = createTestEngine(content);

		// Create ONE effect definition (simulating cached action definition)
		const effect = createTransferEffect(25);
		const initialModifiers = [...effect.params!.donor.change.modifiers];

		// Simulate 10 turns of plundering
		for (let turn = 1; turn <= 10; turn++) {
			// Reset gold for each turn (both players need gold)
			engine.opponent.resourceValues[Resource.gold] = 100;
			engine.activePlayer.resourceValues[Resource.gold] = 100;

			runEffects([effect], engine);

			const currentModifiers = effect.params!.donor.change.modifiers;
			const opponentGold = engine.opponent.resourceValues[Resource.gold] ?? 0;
			const activeGold = engine.activePlayer.resourceValues[Resource.gold] ?? 0;
			const transferred = activeGold - 100; // How much was added

			console.log(
				`Turn ${turn}: modifiers=${JSON.stringify(currentModifiers)}, transferred=${transferred}`,
			);

			// Check for accumulation bug
			if (currentModifiers.length !== initialModifiers.length) {
				console.error(
					`BUG DETECTED: Modifiers array grew from ${initialModifiers.length} to ${currentModifiers.length}`,
				);
			}

			// Should always transfer exactly 25 gold
			expect(transferred).toBe(25);
			expect(opponentGold).toBe(75);
			expect(currentModifiers.length).toBe(1);
		}
	});

	it('isolates effect instances (no shared references)', () => {
		const content = createContentFactory();
		const engine = createTestEngine(content);

		// Create two separate effect definitions
		const effect1 = createTransferEffect(25);
		const effect2 = createTransferEffect(50);

		// Verify they don't share the same modifiers array
		expect(effect1.params!.donor.change.modifiers).not.toBe(
			effect2.params!.donor.change.modifiers,
		);

		// Run effect1
		engine.opponent.resourceValues[Resource.gold] = 100;
		engine.activePlayer.resourceValues[Resource.gold] = 100;
		runEffects([effect1], engine);

		// effect2's modifiers should be unchanged
		expect(effect2.params!.donor.change.modifiers).toEqual([-0.5]);
	});
});
