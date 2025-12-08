import { describe, expect, it } from 'vitest';
import {
	PhaseId,
	Resource as CResource,
	Stat as CStat,
	PopulationRole as CPopulationRole,
	RULES,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import { simulateUpcomingPhases } from '../../src';
import { resourceAmountParams } from '../helpers/resourceParams.ts';

function resetPlayerState(context: ReturnType<typeof createTestEngine>) {
	const player = context.game.players[0]!;
	// Reset Resource values - keys ARE the Resource IDs now
	for (const resourceId of Object.values(CResource)) {
		player.resourceValues[resourceId] = 0;
	}
	for (const statId of Object.values(CStat)) {
		player.resourceValues[statId] = 0;
		player.resourceSources[statId] = {};
	}
	// Reset resourceTouched using stat IDs as keys
	for (const statId of Object.values(CStat)) {
		player.resourceTouched[statId] = false;
	}
	for (const roleId of Object.values(CPopulationRole)) {
		player.resourceValues[roleId] = 0;
	}
	// Reset phase/step skip flags
	for (const key of Object.keys(player.skipPhases)) {
		player.skipPhases[key] = {};
	}
	for (const key of Object.keys(player.skipSteps)) {
		player.skipSteps[key] = {};
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
					resourceId: CResource.gold,
					amount: goldGain,
				}),
			},
		];
		land.upkeep = { [CResource.gold]: upkeepCost };
		// key IS the Resource ID directly
		player.resourceValues[CResource.gold] = 10;

		const result = simulateUpcomingPhases(context, player.id);

		expect(result.playerId).toBe(player.id);
		expect(result.delta.values[CResource.gold]).toBe(goldGain - upkeepCost);
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
					resourceId: CResource.gold,
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
		// Snapshot uses values, not resourceValues
		firstStep.player.values[CResource.gold] = 99;
		firstStep.effects.push({
			type: 'resource',
			method: 'add',
			params: resourceAmountParams({ resourceId: CResource.gold, amount: 1 }),
		});
		expect(context.game.players[0]!.resourceValues[CResource.gold]).toBe(
			player.resourceValues[CResource.gold],
		);
		expect(land.onGainIncomeStep).toHaveLength(1);
		expect(firstStep.player.values[CResource.gold]).toBe(99);
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
