import { describe, it, expect } from 'vitest';
import { runEffects, advance, Resource } from '../../src/index.ts';
import { PhaseId } from '@kingdom-builder/contents';
import {
	TRANSFER_PCT_EVALUATION_ID,
	TRANSFER_PCT_EVALUATION_TYPE,
} from '../../src/effects/resource_transfer.ts';
import { createTestEngine } from '../helpers.ts';
import type { EffectDef } from '../../src/effects/index.ts';

describe('resource:transfer percent bounds', () => {
	it('adjusts transfer percentage within bounds', () => {
		const engineContext = createTestEngine();
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.game.currentPlayerIndex = 0;

		const transfer: EffectDef<{ key: string; percent: number }> = {
			type: 'resource',
			method: 'transfer',
			params: { key: Resource.gold, percent: 50 },
		};
		const addBoost: EffectDef<{ id: string }> = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'boost',
				evaluation: {
					type: TRANSFER_PCT_EVALUATION_TYPE,
					id: TRANSFER_PCT_EVALUATION_ID,
				},
				adjust: 80,
			},
		};
		const removeBoost: EffectDef<{ id: string }> = {
			type: 'result_mod',
			method: 'remove',
			params: {
				id: 'boost',
				evaluation: {
					type: TRANSFER_PCT_EVALUATION_TYPE,
					id: TRANSFER_PCT_EVALUATION_ID,
				},
			},
		};
		const addNerf: EffectDef<{ id: string }> = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'nerf',
				evaluation: {
					type: TRANSFER_PCT_EVALUATION_TYPE,
					id: TRANSFER_PCT_EVALUATION_ID,
				},
				adjust: -200,
			},
		};

		engineContext.activePlayer.gold = 0;
		engineContext.opponent.gold = 10;
		const initialOpponentGold = engineContext.opponent.gold;

		runEffects([addBoost], engineContext);
		runEffects([transfer], engineContext);
		expect(engineContext.activePlayer.gold).toBe(initialOpponentGold);
		expect(engineContext.opponent.gold).toBe(0);

		runEffects([removeBoost], engineContext);
		engineContext.activePlayer.gold = 0;
		engineContext.opponent.gold = initialOpponentGold;

		runEffects([addNerf], engineContext);
		runEffects([transfer], engineContext);
		expect(engineContext.activePlayer.gold).toBe(0);
		expect(engineContext.opponent.gold).toBe(initialOpponentGold);
	});

	it('respects rounding configuration', () => {
		const engineContext = createTestEngine();
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.game.currentPlayerIndex = 0;

		const base: EffectDef<{ key: string; percent: number }> = {
			type: 'resource',
			method: 'transfer',
			params: { key: Resource.gold, percent: 25 },
		};

		const simulateTransfer = (round?: 'up' | 'down') => {
			engineContext.activePlayer.gold = 0;
			engineContext.opponent.gold = 5;
			const effect: EffectDef<{ key: string; percent: number }> = {
				...base,
				round,
			};
			runEffects([effect], engineContext);
			return {
				attacker: engineContext.activePlayer.gold,
				defender: engineContext.opponent.gold,
			};
		};

		const defaultRoundingOutcome = simulateTransfer();
		expect(defaultRoundingOutcome.attacker).toBe(1);
		expect(defaultRoundingOutcome.defender).toBe(4);

		const roundingUpOutcome = simulateTransfer('up');
		expect(roundingUpOutcome.attacker).toBe(2);
		expect(roundingUpOutcome.defender).toBe(3);

		const roundingDownOutcome = simulateTransfer('down');
		expect(roundingDownOutcome.attacker).toBe(1);
		expect(roundingDownOutcome.defender).toBe(4);
	});
});
