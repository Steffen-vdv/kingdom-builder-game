import { describe, expect, it } from 'vitest';
import { PhaseId, Resource, RULES } from '@kingdom-builder/contents';
import type { StatKey } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import { simulateUpcomingPhases } from '../../src';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

function resetPlayerState(context: ReturnType<typeof createTestEngine>) {
	const player = context.game.players[0]!;
	for (const key of Object.keys(player.resources)) {
		player.resources[key] = 0;
	}
	for (const key of Object.keys(player.stats)) {
		player.stats[key] = 0;
		player.statsHistory[key] = false;
		const statId = player.getStatResourceV2Id(key as StatKey);
		player.statSources[statId] = {};
	}
	for (const key of Object.keys(player.population)) {
		player.population[key] = 0;
	}
	player.buildings.clear();
	player.actions.clear();
	for (const land of player.lands) {
		land.developments = [];
		land.slotsUsed = 0;
		delete land.upkeep;
		delete land.onPayUpkeepStep;
		delete land.onGainIncomeStep;
		delete land.onGainAPStep;
	}
	return player;
}

describe('simulateUpcomingPhases (runtime)', () => {
	it('uses default rule metadata to resolve growth and upkeep deltas', () => {
		const context = createTestEngine();
		const player = resetPlayerState(context);
		const land = player.lands[0]!;
		const goldGain = 5;
		const upkeepCost = 2;
		const beforePhase = context.game.currentPhase;
		const beforePlayerIndex = context.game.currentPlayerIndex;
		land.onGainIncomeStep = [
			{
				type: 'resource',
				method: 'add',
				params: resourceAmountParams({
					key: Resource.gold,
					amount: goldGain,
				}),
			},
		];
		land.upkeep = { [Resource.gold]: upkeepCost };
		player.resources[Resource.gold] = 10;

		const result = simulateUpcomingPhases(context, player.id);

		expect(result.playerId).toBe(player.id);
		expect(result.delta.resources[Resource.gold]).toBe(goldGain - upkeepCost);
		expect(
			result.steps
				.filter((step) => step.player.id === player.id)
				.map((step) => step.phase),
		).toEqual(expect.arrayContaining([PhaseId.Growth, PhaseId.Upkeep]));
		expect(context.game.currentPhase).toBe(beforePhase);
		expect(context.game.currentPlayerIndex).toBe(beforePlayerIndex);
	});

	it('accepts explicit phase ids and deep clones returned step snapshots', () => {
		const context = createTestEngine({
			rules: { ...RULES, corePhaseIds: undefined },
		});
		const player = resetPlayerState(context);
		const land = player.lands[0]!;
		land.onGainIncomeStep = [
			{
				type: 'resource',
				method: 'add',
				params: resourceAmountParams({
					key: Resource.gold,
					amount: 3,
				}),
			},
		];
		const result = simulateUpcomingPhases(context, player.id, {
			phaseIds: {
				growth: PhaseId.Growth,
				upkeep: PhaseId.Upkeep,
			},
		});

		expect(result.steps.length).toBeGreaterThan(0);
		const [firstStep] = result.steps;
		const originalEffect = land.onGainIncomeStep?.[0];
		expect(originalEffect).toBeDefined();
		expect(firstStep.player).not.toBe(
			context.game.players.find((candidate) => candidate.id === player.id),
		);
		expect(firstStep.effects[0]).not.toBe(originalEffect);
		firstStep.player.resources[Resource.gold] = 99;
		firstStep.effects.push({
			type: 'resource',
			method: 'add',
			params: resourceAmountParams({
				key: Resource.gold,
				amount: 1,
			}),
		});
		expect(context.game.players[0]!.resources[Resource.gold]).toBe(
			player.resources[Resource.gold],
		);
		expect(land.onGainIncomeStep).toHaveLength(1);
		expect(firstStep.player.resources[Resource.gold]).toBe(99);
	});

	it('enforces iteration limits to prevent runaway simulations', () => {
		const context = createTestEngine();
		const player = context.game.players[0]!;
		expect(() =>
			simulateUpcomingPhases(context, player.id, { maxIterations: 0 }),
		).toThrow('simulateUpcomingPhases exceeded iteration limit.');
	});

	it('throws when the target player id is not present', () => {
		const context = createTestEngine();
		expect(() => simulateUpcomingPhases(context, 'missing-player')).toThrow(
			'Player missing-player does not exist in this context.',
		);
	});
});
