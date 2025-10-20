import { describe, it, expect } from 'vitest';
import { runEffects, advance, Resource } from '../../src/index.ts';
import { PhaseId } from '@kingdom-builder/contents';
import {
	TRANSFER_AMT_EVALUATION_ID,
	TRANSFER_AMT_EVALUATION_TYPE,
} from '../../src/effects/resource_transfer.ts';
import { createTestEngine } from '../helpers.ts';
import type { EffectDef } from '../../src/effects/index.ts';

describe('resource:transfer amount handling', () => {
	it('moves a fixed amount up to the defender total', () => {
		const engineContext = createTestEngine();
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.game.currentPlayerIndex = 0;

		const transfer: EffectDef<{ key: string; amount: number }> = {
			type: 'resource',
			method: 'transfer',
			params: { key: Resource.happiness, amount: 2 },
		};

		engineContext.activePlayer.happiness = 0;
		engineContext.opponent.happiness = 1;

		runEffects([transfer], engineContext);

		expect(engineContext.activePlayer.happiness).toBe(1);
		expect(engineContext.opponent.happiness).toBe(0);
	});

	it('applies evaluation modifiers to transfer amount', () => {
		const engineContext = createTestEngine();
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.game.currentPlayerIndex = 0;

		const addBoost: EffectDef<{ id: string }> = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'boost',
				evaluation: {
					type: TRANSFER_AMT_EVALUATION_TYPE,
					id: TRANSFER_AMT_EVALUATION_ID,
				},
				adjust: 2,
			},
		};

		const transfer: EffectDef<{ key: string; amount: number }> = {
			type: 'resource',
			method: 'transfer',
			params: { key: Resource.happiness, amount: 1 },
		};

		engineContext.activePlayer.happiness = 0;
		engineContext.opponent.happiness = 5;

		runEffects([addBoost], engineContext);
		runEffects([transfer], engineContext);

		expect(engineContext.activePlayer.happiness).toBe(3);
		expect(engineContext.opponent.happiness).toBe(2);
	});
});
