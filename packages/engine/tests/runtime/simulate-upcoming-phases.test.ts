import { describe, expect, it } from 'vitest';
import {
	PhaseId,
	Resource as CResource,
	RULES,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import { simulateUpcomingPhases } from '../../src';
import { resourceAmountParams } from '../helpers/resourceParams.ts';

function resetPlayerState(context: ReturnType<typeof createTestEngine>) {
	const player = context.game.players[0]!;
	// Reset all resource values (now unified under CResource)
	for (const resourceId of Object.values(CResource)) {
		player.resourceValues[resourceId] = 0;
		player.resourceSources[resourceId] = {};
		player.resourceTouched[resourceId] = false;
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

	describe('forecastBreakdown', () => {
		it('returns forecastBreakdown with gains and losses', () => {
			const context = createTestEngine();
			const player = resetPlayerState(context);
			const land = player.lands[0]!;
			const goldGain = 5;
			const upkeepCost = 2;
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
			player.resourceValues[CResource.gold] = 10;

			const result = simulateUpcomingPhases(context, player.id);

			expect(result.forecastBreakdown).toBeDefined();
			const goldBreakdown = result.forecastBreakdown[CResource.gold];
			expect(goldBreakdown).toBeDefined();
			expect(goldBreakdown.net).toBe(goldGain - upkeepCost);
			expect(goldBreakdown.gains.length).toBeGreaterThan(0);
			expect(goldBreakdown.losses.length).toBeGreaterThan(0);
		});

		it('includes kind and id in forecast contributions', () => {
			const context = createTestEngine();
			const player = resetPlayerState(context);
			const land = player.lands[0]!;
			land.onGainIncomeStep = [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						resourceId: CResource.gold,
						amount: 10,
					}),
				},
			];
			player.resourceValues[CResource.gold] = 0;

			const result = simulateUpcomingPhases(context, player.id);

			const goldBreakdown = result.forecastBreakdown[CResource.gold];
			expect(goldBreakdown).toBeDefined();
			expect(goldBreakdown.gains.length).toBeGreaterThan(0);
			const gain = goldBreakdown.gains[0];
			expect(gain.amount).toBe(10);
			expect(gain.sourceKey).toBeDefined();
		});

		it('excludes resources with no contributors', () => {
			const context = createTestEngine();
			const player = resetPlayerState(context);
			// Set up a resource with no changes
			player.resourceValues[CResource.gold] = 100;
			// No land effects, no upkeep

			const result = simulateUpcomingPhases(context, player.id);

			// Gold should not be in breakdown since no changes occurred
			expect(result.forecastBreakdown[CResource.gold]).toBeUndefined();
		});

		it('separates positive and negative contributions correctly', () => {
			const context = createTestEngine();
			const player = resetPlayerState(context);
			const land = player.lands[0]!;
			land.onGainIncomeStep = [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						resourceId: CResource.gold,
						amount: 20,
					}),
				},
			];
			land.upkeep = { [CResource.gold]: 5 };
			player.resourceValues[CResource.gold] = 50;

			const result = simulateUpcomingPhases(context, player.id);

			const goldBreakdown = result.forecastBreakdown[CResource.gold];
			expect(goldBreakdown).toBeDefined();

			// Verify all gains are positive
			for (const gain of goldBreakdown.gains) {
				expect(gain.amount).toBeGreaterThan(0);
			}

			// Verify all losses are negative
			for (const loss of goldBreakdown.losses) {
				expect(loss.amount).toBeLessThan(0);
			}

			// Verify net matches delta
			expect(goldBreakdown.net).toBe(result.delta.values[CResource.gold]);
		});

		it('clears resourceSources before simulation to capture only forecast', () => {
			const context = createTestEngine();
			const player = resetPlayerState(context);
			// Pre-populate resourceSources with historic data
			player.resourceSources[CResource.gold] = {
				'historic-source': {
					amount: 999,
					meta: { sourceKey: 'historic-source' },
				},
			};
			const land = player.lands[0]!;
			land.onGainIncomeStep = [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						resourceId: CResource.gold,
						amount: 5,
					}),
				},
			];

			const result = simulateUpcomingPhases(context, player.id);

			const goldBreakdown = result.forecastBreakdown[CResource.gold];
			expect(goldBreakdown).toBeDefined();
			// Should not include the historic 999 amount
			expect(goldBreakdown.net).toBe(5);
			// Original context should be unchanged
			expect(
				player.resourceSources[CResource.gold]['historic-source'],
			).toBeDefined();
		});
	});
});
