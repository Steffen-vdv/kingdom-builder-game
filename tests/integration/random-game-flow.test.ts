import { describe, it, expect } from 'vitest';
import {
	performAction,
	advance,
	getActionCosts,
} from '@kingdom-builder/engine';
import { createSyntheticContext } from './synthetic';

function createRng(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0x100000000;
	};
}

describe('random action flow', () => {
	it('advances phases, pays costs and applies effects across turns', () => {
		const { engineContext, actions, phases, costResourceId, gainResourceId } =
			createSyntheticContext();
		const actionIds = actions.map((a) => a.id);
		const mainPhase = phases[0].id;
		const endPhase = phases[1].id;
		const endStep = phases[1].steps[0];
		const effects = endStep.effects as
			| {
					type?: string;
					method?: string;
					params?: { change: { amount: number } };
			  }[]
			| undefined;
		const regenEffect = (effects || []).find(
			(e) => e.type === 'resource' && e.method === 'add',
		);
		const regenAmount = (regenEffect?.params as { change: { amount: number } })
			.change.amount;
		const rng = createRng(42);
		const initialTurn = engineContext.game.turn;
		const turns = 3;
		const actionRegistry = engineContext.actions;

		for (let turnIndex = 0; turnIndex < turns; turnIndex++) {
			for (
				let playerIndex = 0;
				playerIndex < engineContext.game.players.length;
				playerIndex++
			) {
				expect(engineContext.game.currentPhase).toBe(mainPhase);
				const hasAvailableCost = () => {
					const { resourceValues } = engineContext.activePlayer;
					return (resourceValues[costResourceId] ?? 0) > 0;
				};
				while (hasAvailableCost()) {
					const playerResources = engineContext.activePlayer.resourceValues;
					const randomIndex = Math.floor(rng() * actionIds.length);
					const actionId = actionIds[randomIndex];
					const costs = getActionCosts(actionId, engineContext);
					const beforeCost = playerResources[costResourceId];
					const beforeGain = playerResources[gainResourceId];
					const action = actionRegistry.get(actionId)!;
					const gainEffect = action.effects.find(
						(e) => e.type === 'resource' && e.method === 'add',
					)!;
					const gain = (gainEffect.params as { change: { amount: number } })
						.change.amount;
					performAction(actionId, engineContext);
					expect(playerResources[costResourceId]).toBe(
						beforeCost - (costs[costResourceId] ?? 0),
					);
					expect(playerResources[gainResourceId]).toBe(beforeGain + gain);
				}
				const currentIndex = engineContext.game.currentPlayerIndex;
				advance(engineContext);
				expect(engineContext.game.currentPhase).toBe(endPhase);
				expect(engineContext.game.currentPlayerIndex).toBe(currentIndex);
				const player = engineContext.activePlayer;
				const beforeRegen = player.resourceValues[costResourceId];
				advance(engineContext);
				expect(player.resourceValues[costResourceId]).toBe(
					beforeRegen + regenAmount,
				);
				expect(engineContext.game.currentPhase).toBe(mainPhase);
				expect(engineContext.game.currentPlayerIndex).toBe(
					(currentIndex + 1) % engineContext.game.players.length,
				);
			}
		}
		expect(engineContext.game.turn).toBe(initialTurn + turns);
	});
});
