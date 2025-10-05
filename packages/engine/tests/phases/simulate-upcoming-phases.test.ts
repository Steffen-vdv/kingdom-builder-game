import { describe, expect, it } from 'vitest';
import { PhaseId, Resource, PopulationRole } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { simulateUpcomingPhases } from '../../src';

function sanitizePlayerState(context: ReturnType<typeof createTestEngine>) {
	const player = context.game.players[0]!;
	for (const key of Object.keys(player.resources)) {
		player.resources[key] = 0;
	}
	for (const key of Object.keys(player.stats)) {
		player.stats[key] = 0;
		player.statsHistory[key] = false;
		player.statSources[key] = {};
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

describe('simulateUpcomingPhases', () => {
	it('resolves growth/upkeep effects without mutating the source context', () => {
		const context = createTestEngine();
		const player = sanitizePlayerState(context);
		const land = player.lands[0]!;
		const goldGain = 7;
		const apGain = 2;
		land.onGainIncomeStep = [
			{
				type: 'resource',
				method: 'add',
				params: { key: Resource.gold, amount: goldGain },
			},
		];
		land.onGainAPStep = [
			{
				type: 'resource',
				method: 'add',
				params: { key: Resource.ap, amount: apGain },
			},
		];
		const beforePhase = context.game.currentPhase;
		const beforePlayerIndex = context.game.currentPlayerIndex;
		const result = simulateUpcomingPhases(context, player.id, {
			phaseIds: {
				growth: PhaseId.Growth,
				upkeep: PhaseId.Upkeep,
			},
		});
		expect(context.game.currentPhase).toBe(beforePhase);
		expect(context.game.currentPlayerIndex).toBe(beforePlayerIndex);
		expect(result.delta.resources[Resource.gold]).toBe(goldGain);
		expect(result.delta.resources[Resource.ap]).toBe(apGain);
		expect(result.delta.stats).toEqual({});
		expect(result.delta.population).toEqual({});
	});

	it('treats skip flags as completing the affected phases', () => {
		const context = createTestEngine();
		const player = sanitizePlayerState(context);
		const skipId = 'test-skip';
		player.skipPhases[PhaseId.Growth] = { [skipId]: true };
		player.skipPhases[PhaseId.Upkeep] = { [skipId]: true };
		const result = simulateUpcomingPhases(context, player.id, {
			phaseIds: {
				growth: PhaseId.Growth,
				upkeep: PhaseId.Upkeep,
			},
		});
		expect(result.delta.resources).toEqual({});
		expect(
			result.steps.some((step) => step.skipped?.phaseId === PhaseId.Growth),
		).toBe(true);
		expect(
			result.steps.some((step) => step.skipped?.phaseId === PhaseId.Upkeep),
		).toBe(true);
	});

	it('applies upkeep costs from lands and population', () => {
		const context = createTestEngine();
		const player = sanitizePlayerState(context);
		const land = player.lands[0]!;
		const upkeepCost = 3;
		player.resources[Resource.gold] = 10;
		land.upkeep = { [Resource.gold]: upkeepCost };
		player.population[PopulationRole.Council] = 1;
		const result = simulateUpcomingPhases(context, player.id, {
			phaseIds: {
				growth: PhaseId.Growth,
				upkeep: PhaseId.Upkeep,
			},
		});
		const councilUpkeep =
			context.populations.get(PopulationRole.Council)?.upkeep?.[
				Resource.gold
			] ?? 0;
		expect(result.delta.resources[Resource.gold]).toBe(
			-(upkeepCost + councilUpkeep),
		);
		expect(result.after.resources[Resource.gold]).toBe(
			10 - upkeepCost - councilUpkeep,
		);
	});
});
