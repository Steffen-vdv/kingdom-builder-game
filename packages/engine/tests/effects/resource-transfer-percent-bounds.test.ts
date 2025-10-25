import { describe, it, expect } from 'vitest';
import { runEffects, advance, Resource } from '../../src/index.ts';
import { PhaseId } from '@kingdom-builder/contents';
import { getResourceV2Id } from '@kingdom-builder/contents/resources';
import {
	resourceTransfer,
	transferEndpoint,
	type ResourceV2TransferEffectParams,
} from '@kingdom-builder/contents/resourceV2';
import {
	TRANSFER_AMOUNT_EVALUATION_ID,
	TRANSFER_AMOUNT_EVALUATION_TYPE,
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

		const goldResourceId = getResourceV2Id(Resource.gold);

		const transfer: EffectDef<ResourceV2TransferEffectParams> = {
			type: 'resource',
			method: 'transfer',
			params: resourceTransfer()
				.donor(
					transferEndpoint(goldResourceId)
						.player('opponent')
						.change((change) => change.percent(-0.5))
						.build(),
				)
				.recipient(
					transferEndpoint(goldResourceId)
						.player('active')
						.change((change) => change.percent(0.5))
						.build(),
				)
				.build(),
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

		const base: EffectDef<ResourceV2TransferEffectParams> = {
			type: 'resource',
			method: 'transfer',
			params: resourceTransfer()
				.donor(
					transferEndpoint(goldResourceId)
						.player('opponent')
						.change((change) => change.percent(-0.25))
						.build(),
				)
				.recipient(
					transferEndpoint(goldResourceId)
						.player('active')
						.change((change) => change.percent(0.25))
						.build(),
				)
				.build(),
		};

		const run = (round?: 'up' | 'down') => {
			engineContext.activePlayer.gold = 0;
			engineContext.opponent.gold = 5;
			const effect: EffectDef<ResourceV2TransferEffectParams> = {
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
});

describe('resource:transfer amount behaviour', () => {
	it('applies amount modifiers within available resources', () => {
		const engineContext = createTestEngine();
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.game.currentPlayerIndex = 0;

		const happinessResourceId = getResourceV2Id(Resource.happiness);

		const transfer: EffectDef<ResourceV2TransferEffectParams> = {
			type: 'resource',
			method: 'transfer',
			params: resourceTransfer()
				.donor(
					transferEndpoint(happinessResourceId)
						.player('opponent')
						.change((change) => change.amount(-2))
						.build(),
				)
				.recipient(
					transferEndpoint(happinessResourceId)
						.player('active')
						.change((change) => change.amount(2))
						.build(),
				)
				.build(),
		};
		const addBoost: EffectDef<{ id: string }> = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'amount_boost',
				evaluation: {
					type: TRANSFER_AMOUNT_EVALUATION_TYPE,
					id: TRANSFER_AMOUNT_EVALUATION_ID,
				},
				adjust: 3,
			},
		};
		const removeBoost: EffectDef<{ id: string }> = {
			type: 'result_mod',
			method: 'remove',
			params: {
				id: 'amount_boost',
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
				id: 'amount_nerf',
				evaluation: {
					type: TRANSFER_AMOUNT_EVALUATION_TYPE,
					id: TRANSFER_AMOUNT_EVALUATION_ID,
				},
				adjust: -5,
			},
		};

		runEffects([addBoost], engineContext);
		engineContext.activePlayer.happiness = 0;
		engineContext.opponent.happiness = 4;
		runEffects([transfer], engineContext);
		expect(engineContext.activePlayer.happiness).toBe(4);
		expect(engineContext.opponent.happiness).toBe(0);

		runEffects([removeBoost], engineContext);
		engineContext.activePlayer.happiness = 0;
		engineContext.opponent.happiness = 4;
		runEffects([addNerf], engineContext);
		runEffects([transfer], engineContext);
		expect(engineContext.activePlayer.happiness).toBe(0);
		expect(engineContext.opponent.happiness).toBe(4);
	});

	it('transfers the full static amount even when the defender is in debt', () => {
		const engineContext = createTestEngine();
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.game.currentPlayerIndex = 0;

		const transfer: EffectDef<ResourceV2TransferEffectParams> = {
			type: 'resource',
			method: 'transfer',
			params: resourceTransfer()
				.donor(
					transferEndpoint(happinessResourceId)
						.player('opponent')
						.change((change) => change.amount(-1))
						.build(),
				)
				.recipient(
					transferEndpoint(happinessResourceId)
						.player('active')
						.change((change) => change.amount(1))
						.build(),
				)
				.build(),
		};

		engineContext.activePlayer.happiness = 0;
		engineContext.opponent.happiness = -3;

		runEffects([transfer], engineContext);

		expect(engineContext.activePlayer.happiness).toBe(1);
		expect(engineContext.opponent.happiness).toBe(-4);
	});
});
