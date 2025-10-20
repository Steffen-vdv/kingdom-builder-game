import { describe, it, expect } from 'vitest';
import { runEffects, advance, Resource } from '../../src/index.ts';
import { PhaseId } from '@kingdom-builder/contents';
import {
	TRANSFER_PCT_EVALUATION_ID,
	TRANSFER_PCT_EVALUATION_TYPE,
	TRANSFER_AMOUNT_EVALUATION_ID,
	TRANSFER_AMOUNT_EVALUATION_TYPE,
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
		const total = engineContext.opponent.gold;

		runEffects([addBoost], engineContext);
		runEffects([transfer], engineContext);
		expect(engineContext.activePlayer.gold).toBe(total);
		expect(engineContext.opponent.gold).toBe(0);

		runEffects([removeBoost], engineContext);
		engineContext.activePlayer.gold = 0;
		engineContext.opponent.gold = total;

		runEffects([addNerf], engineContext);
		runEffects([transfer], engineContext);
		expect(engineContext.activePlayer.gold).toBe(0);
		expect(engineContext.opponent.gold).toBe(total);
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

		const run = (round?: 'up' | 'down') => {
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

		const floor = run();
		expect(floor.attacker).toBe(1);
		expect(floor.defender).toBe(4);

		const roundedUp = run('up');
		expect(roundedUp.attacker).toBe(2);
		expect(roundedUp.defender).toBe(3);

		const roundedDown = run('down');
		expect(roundedDown.attacker).toBe(1);
		expect(roundedDown.defender).toBe(4);
	});

	it('adjusts transfer amount within bounds', () => {
		const engineContext = createTestEngine();
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.game.currentPlayerIndex = 0;
		const transfer: EffectDef<{ key: string; amount: number }> = {
			type: 'resource',
			method: 'transfer',
			params: { key: Resource.gold, amount: 3 },
		};
		const addBoost: EffectDef<{ id: string }> = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'amountBoost',
				evaluation: {
					type: TRANSFER_AMOUNT_EVALUATION_TYPE,
					id: TRANSFER_AMOUNT_EVALUATION_ID,
				},
				adjust: 10,
			},
		};
		const removeBoost: EffectDef<{ id: string }> = {
			type: 'result_mod',
			method: 'remove',
			params: {
				id: 'amountBoost',
				evaluation: {
					type: TRANSFER_AMOUNT_EVALUATION_TYPE,
					id: TRANSFER_AMOUNT_EVALUATION_ID,
				},
			},
		};
		const addNerf: EffectDef<{ id: string }> = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'amountNerf',
				evaluation: {
					type: TRANSFER_AMOUNT_EVALUATION_TYPE,
					id: TRANSFER_AMOUNT_EVALUATION_ID,
				},
				adjust: -10,
			},
		};

		engineContext.activePlayer.gold = 0;
		engineContext.opponent.gold = 5;

		runEffects([addBoost], engineContext);
		runEffects([transfer], engineContext);
		expect(engineContext.activePlayer.gold).toBe(5);
		expect(engineContext.opponent.gold).toBe(0);

		runEffects([removeBoost], engineContext);
		engineContext.activePlayer.gold = 0;
		engineContext.opponent.gold = 5;

		runEffects([addNerf], engineContext);
		runEffects([transfer], engineContext);
		expect(engineContext.activePlayer.gold).toBe(0);
		expect(engineContext.opponent.gold).toBe(5);
	});

	it('applies rounding to amount transfers', () => {
		const engineContext = createTestEngine();
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.game.currentPlayerIndex = 0;
		const base: EffectDef<{ key: string; amount: number }> = {
			type: 'resource',
			method: 'transfer',
			params: { key: Resource.gold, amount: 1.5 },
		};
		const run = (round?: 'up' | 'down') => {
			engineContext.activePlayer.gold = 0;
			engineContext.opponent.gold = 4;
			const effect: EffectDef<{ key: string; amount: number }> = {
				...base,
				round,
			};
			runEffects([effect], engineContext);
			return {
				attacker: engineContext.activePlayer.gold,
				defender: engineContext.opponent.gold,
			};
		};
		const defaultRound = run();
		expect(defaultRound.attacker).toBe(1);
		expect(defaultRound.defender).toBe(3);
		const roundedUp = run('up');
		expect(roundedUp.attacker).toBe(2);
		expect(roundedUp.defender).toBe(2);
		const roundedDown = run('down');
		expect(roundedDown.attacker).toBe(1);
		expect(roundedDown.defender).toBe(3);
	});
});
