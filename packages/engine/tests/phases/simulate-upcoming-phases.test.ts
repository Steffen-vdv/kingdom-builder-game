import { describe, expect, it } from 'vitest';
import {
	PhaseId,
	Resource,
	PopulationRole,
	PHASES,
	RULES,
} from '@kingdom-builder/contents';
import type { StatKey } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { simulateUpcomingPhases } from '../../src';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

function sanitizePlayerState(context: ReturnType<typeof createTestEngine>) {
	const player = context.game.players[0]!;
	// Reset ResourceV2 values (the actual storage)
	for (const key of Object.keys(player.resources)) {
		const resourceId = player.getResourceV2Id(key);
		player.resourceValues[resourceId] = 0;
	}
	for (const key of Object.keys(player.stats)) {
		const statId = player.getStatResourceV2Id(key as StatKey);
		player.resourceValues[statId] = 0;
		player.statsHistory[key] = false;
		player.statSources[statId] = {};
	}
	for (const key of Object.keys(player.population)) {
		const populationResourceId = player.getPopulationResourceV2Id(key);
		player.resourceValues[populationResourceId] = 0;
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
					key: Resource.gold,
					amount: goldGain,
				}),
			},
		];
		land.onGainAPStep = [
			{
				type: 'resource',
				method: 'add',
				params: resourceAmountParams({
					key: Resource.ap,
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
		player.resourceValues[player.getResourceV2Id(Resource.gold)] = 10;
		land.upkeep = { [Resource.gold]: upkeepCost };
		player.resourceValues[player.getPopulationResourceV2Id(PopulationRole.Council)] = 1;
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
					key: Resource.gold,
					amount: goldGain,
				}),
			},
		];
		land.upkeep = { [Resource.gold]: upkeepCost };
		player.resourceValues[player.getResourceV2Id(Resource.gold)] = 10;
		const result = simulateUpcomingPhases(context, player.id);
		const relevantPhases = result.steps
			.filter((step) => step.player.id === player.id)
			.map((step) => step.phase);
		expect(relevantPhases).toContain(PhaseId.Growth);
		expect(relevantPhases).toContain(PhaseId.Upkeep);
		expect(result.delta.resources[Resource.gold]).toBe(goldGain - upkeepCost);
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
