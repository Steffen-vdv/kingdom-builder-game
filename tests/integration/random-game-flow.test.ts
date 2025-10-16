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
		const { engineContext, actions, phases, costKey, gainKey } =
			createSyntheticContext();
		const actionIds = actions.map((a) => a.id);
		const mainPhase = phases[0].id;
		const endPhase = phases[1].id;
		const endStep = phases[1].steps[0];
		const effects = endStep.effects as
			| { type?: string; method?: string; params?: { amount: number } }[]
			| undefined;
		const regenEffect = (effects || []).find(
			(e) => e.type === 'resource' && e.method === 'add',
		);
		const regenAmount = (regenEffect?.params as { amount: number }).amount;
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
					const { resources } = engineContext.activePlayer;
					return (resources[costKey] ?? 0) > 0;
				};
				while (hasAvailableCost()) {
					const playerResources = engineContext.activePlayer.resources;
					const randomIndex = Math.floor(rng() * actionIds.length);
					const actionId = actionIds[randomIndex];
					const costs = getActionCosts(actionId, engineContext);
					const beforeCost = playerResources[costKey];
					const beforeGain = playerResources[gainKey];
					const action = actionRegistry.get(actionId)!;
					const gain = (
						action.effects.find(
							(e) => e.type === 'resource' && e.method === 'add',
						)!.params as { amount: number }
					).amount;
					performAction(actionId, engineContext);
					expect(playerResources[costKey]).toBe(
						beforeCost - (costs[costKey] ?? 0),
					);
					expect(playerResources[gainKey]).toBe(beforeGain + gain);
				}
				const currentIndex = engineContext.game.currentPlayerIndex;
				advance(engineContext);
				expect(engineContext.game.currentPhase).toBe(endPhase);
				expect(engineContext.game.currentPlayerIndex).toBe(currentIndex);
				const player = engineContext.activePlayer;
				const beforeRegen = player.resources[costKey];
				advance(engineContext);
				expect(player.resources[costKey]).toBe(beforeRegen + regenAmount);
				expect(engineContext.game.currentPhase).toBe(mainPhase);
				expect(engineContext.game.currentPlayerIndex).toBe(
					(currentIndex + 1) % engineContext.game.players.length,
				);
			}
		}
		expect(engineContext.game.turn).toBe(initialTurn + turns);
	});
});
