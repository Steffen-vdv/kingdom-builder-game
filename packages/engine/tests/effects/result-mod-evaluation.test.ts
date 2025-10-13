import { describe, it, expect } from 'vitest';
import { Resource, PhaseId } from '@kingdom-builder/contents';
import { runEffects, advance, type EffectDef } from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';

const EVALUATION_TARGET = 'test:evaluation';

function advanceToMainPhase() {
	const engineContext = createTestEngine();
	while (engineContext.game.currentPhase !== PhaseId.Main) {
		advance(engineContext);
	}
	return engineContext;
}

describe('result_mod evaluation modifiers', () => {
	it('applies nested effects, adjustments and bonus amounts for the owner', () => {
		const engineContext = advanceToMainPhase();
		const modifierEffect: EffectDef<{
			id: string;
			evaluation: { type: string; id: string };
			adjust: number;
			amount: number;
		}> = {
			type: 'result_mod',
			method: 'add',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: Resource.gold, amount: 5 },
				},
			],
			params: {
				id: 'bonus',
				evaluation: { type: 'test', id: 'evaluation' },
				adjust: 2,
				amount: 3,
			},
		};
		runEffects([modifierEffect], engineContext);
		const gains = [
			{ key: Resource.gold, amount: 4 },
			{ key: Resource.happiness, amount: -2 },
		];
		engineContext.activePlayer.gold = 0;
		engineContext.activePlayer.happiness = 0;
		engineContext.passives.runEvaluationMods(
			EVALUATION_TARGET,
			engineContext,
			gains,
		);
		expect(gains[0]!.amount).toBe(6);
		expect(gains[1]!.amount).toBe(0);
		expect(engineContext.activePlayer.gold).toBe(8);
		expect(engineContext.activePlayer.happiness).toBe(0);
	});

	it('applies percent modifiers with rounding only for the owning player', () => {
		const engineContext = advanceToMainPhase();
		const percentEffect: EffectDef<{
			id: string;
			evaluation: { type: string; id: string };
			percent: number;
		}> = {
			type: 'result_mod',
			method: 'add',
			round: 'up',
			params: {
				id: 'multiplier',
				evaluation: { type: 'test', id: 'evaluation' },
				percent: 0.5,
			},
		};
		runEffects([percentEffect], engineContext);
		const gains = [{ key: Resource.gold, amount: 1 }];
		engineContext.passives.runEvaluationMods(
			EVALUATION_TARGET,
			engineContext,
			gains,
		);
		expect(gains[0]!.amount).toBe(2);
		engineContext.game.currentPlayerIndex = 1;
		const opponentGains = [{ key: Resource.gold, amount: 2 }];
		engineContext.passives.runEvaluationMods(
			EVALUATION_TARGET,
			engineContext,
			opponentGains,
		);
		expect(opponentGains[0]!.amount).toBe(2);
	});
});
