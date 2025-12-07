import { describe, expect, it } from 'vitest';
import {
	PhaseId,
	Resource,
	PHASES,
	RULES,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { simulateUpcomingPhases } from '../../src';
import { resourceAmountParams } from '../helpers/resourceParams.ts';

function sanitizePlayerState(context: ReturnType<typeof createTestEngine>) {
	const player = context.game.players[0]!;
	// Keys ARE Resource IDs directly - no mapper needed
	// Reset all Resource values (the unified storage)
	for (const key of Object.keys(player.resourceValues)) {
		player.resourceValues[key] = 0;
	}
	for (const key of Object.keys(player.resourceTouched)) {
		player.resourceTouched[key] = false;
	}
	for (const key of Object.keys(player.resourceSources)) {
		player.resourceSources[key] = {};
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
				params: resourceAmountParams({
					resourceId: Resource.gold,
					amount: goldGain,
				}),
			},
		];
		land.onGainAPStep = [
			{
				type: 'resource',
				method: 'add',
				params: resourceAmountParams({
					resourceId: Resource.ap,
					amount: apGain,
				}),
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
		expect(result.delta.values[Resource.gold]).toBe(goldGain);
		expect(result.delta.values[Resource.ap]).toBe(apGain);
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
		expect(result.delta.values).toEqual({});
		expect(
			result.steps.some((step) => step.skipped?.phaseId === PhaseId.Growth),
		).toBe(true);
		expect(
			result.steps.some((step) => step.skipped?.phaseId === PhaseId.Upkeep),
		).toBe(true);
	});

	it('applies upkeep costs from lands', () => {
		const context = createTestEngine();
		const player = sanitizePlayerState(context);
		const land = player.lands[0]!;
		const upkeepCost = 3;
		// Keys ARE Resource IDs directly - no mapper needed
		player.resourceValues[Resource.gold] = 10;
		land.upkeep = { [Resource.gold]: upkeepCost };
		const result = simulateUpcomingPhases(context, player.id, {
			phaseIds: {
				growth: PhaseId.Growth,
				upkeep: PhaseId.Upkeep,
			},
		});
		expect(result.delta.values[Resource.gold]).toBe(-upkeepCost);
		expect(result.after.values[Resource.gold]).toBe(10 - upkeepCost);
	});

	it('uses rule metadata to resolve growth and upkeep when phases are reordered', () => {
		const phases = [PHASES[2]!, PHASES[0]!, PHASES[1]!];
		const context = createTestEngine({ phases });
		const player = sanitizePlayerState(context);
		const land = player.lands[0]!;
		const goldGain = 4;
		const upkeepCost = 2;
		land.onGainIncomeStep = [
			{
				type: 'resource',
				method: 'add',
				params: resourceAmountParams({
					resourceId: Resource.gold,
					amount: goldGain,
				}),
			},
		];
		land.upkeep = { [Resource.gold]: upkeepCost };
		// Keys ARE Resource IDs directly - no mapper needed
		player.resourceValues[Resource.gold] = 10;
		const result = simulateUpcomingPhases(context, player.id);
		const relevantPhases = result.steps
			.filter((step) => step.player.id === player.id)
			.map((step) => step.phase);
		expect(relevantPhases).toContain(PhaseId.Growth);
		expect(relevantPhases).toContain(PhaseId.Upkeep);
		expect(result.delta.values[Resource.gold]).toBe(goldGain - upkeepCost);
	});

	it('throws when rule metadata omits core phase ids', () => {
		const rulesWithoutMetadata = { ...RULES, corePhaseIds: undefined };
		const context = createTestEngine({ rules: rulesWithoutMetadata });
		const player = sanitizePlayerState(context);
		expect(() => simulateUpcomingPhases(context, player.id)).toThrow(
			'simulateUpcomingPhases requires growth and upkeep phase ids in options.phaseIds or rules.corePhaseIds.',
		);
	});

	it('throws when rule metadata references missing phases', () => {
		const invalidRules = {
			...RULES,
			corePhaseIds: {
				growth: 'missing-growth-phase',
				upkeep: PhaseId.Upkeep,
			},
		};
		const context = createTestEngine({ rules: invalidRules });
		const player = sanitizePlayerState(context);
		expect(() => simulateUpcomingPhases(context, player.id)).toThrow(
			'simulateUpcomingPhases could not find growth phase "missing-growth-phase" in the engine context.',
		);
	});
});
