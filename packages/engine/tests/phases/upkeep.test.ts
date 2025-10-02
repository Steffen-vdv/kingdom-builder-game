import { describe, it, expect } from 'vitest';
import { advance } from '../../src/index.ts';
import { createPhaseTestEnvironment } from './fixtures.ts';

describe('Upkeep phase', () => {
	it('charges gold per population role', () => {
		const { ctx, phases, ids, roles, resources, values } =
			createPhaseTestEnvironment();
		const upkeepIndex = phases.findIndex(
			(phase) => phase.id === ids.phases.upkeep,
		);
		const payStepIndex = phases[upkeepIndex]!.steps.findIndex(
			(step) => step.id === ids.steps.payUpkeep,
		);
		ctx.game.phaseIndex = upkeepIndex;
		ctx.game.currentPhase = ids.phases.upkeep;
		ctx.game.stepIndex = payStepIndex;
		ctx.game.currentStep = ids.steps.payUpkeep;
		ctx.activePlayer.population[roles.legion] = 1;
		ctx.activePlayer.population[roles.fortifier] = 1;
		const startGold = 5;
		ctx.activePlayer.resources[resources.gold] = startGold;
		const councils = ctx.activePlayer.population[roles.council];
		const player = ctx.activePlayer;
		advance(ctx);
		ctx.game.currentPlayerIndex = 0;
		const expectedGold =
			startGold -
			(values.upkeep.council * councils +
				values.upkeep.legion +
				values.upkeep.fortifier);
		expect(player.resources[resources.gold]).toBe(expectedGold);
	});

	it('throws if upkeep cannot be paid', () => {
		const { ctx, phases, ids, roles, resources, values } =
			createPhaseTestEnvironment();
		const upkeepIndex = phases.findIndex(
			(phase) => phase.id === ids.phases.upkeep,
		);
		const payStepIndex = phases[upkeepIndex]!.steps.findIndex(
			(step) => step.id === ids.steps.payUpkeep,
		);
		ctx.game.phaseIndex = upkeepIndex;
		ctx.game.currentPhase = ids.phases.upkeep;
		ctx.game.stepIndex = payStepIndex;
		ctx.game.currentStep = ids.steps.payUpkeep;
		ctx.activePlayer.population[roles.legion] = 1;
		const councils = ctx.activePlayer.population[roles.council];
		const totalCost = values.upkeep.council * councils + values.upkeep.legion;
		ctx.activePlayer.resources[resources.gold] = totalCost - 1;
		expect(() => advance(ctx)).toThrow();
	});

	it('reduces war weariness by 1 when above 0', () => {
		const { ctx, phases, ids, stats } = createPhaseTestEnvironment();
		const upkeepIndex = phases.findIndex(
			(phase) => phase.id === ids.phases.upkeep,
		);
		const warStepIndex = phases[upkeepIndex]!.steps.findIndex(
			(step) => step.id === ids.steps.warRecovery,
		);
		ctx.game.phaseIndex = upkeepIndex;
		ctx.game.currentPhase = ids.phases.upkeep;
		ctx.game.stepIndex = warStepIndex;
		ctx.game.currentStep = ids.steps.warRecovery;
		ctx.activePlayer.stats[stats.war] = 2;
		advance(ctx);
		ctx.game.currentPlayerIndex = 0;
		expect(ctx.activePlayer.stats[stats.war]).toBe(1);
	});

	it('does not drop war weariness below zero', () => {
		const { ctx, phases, ids, stats } = createPhaseTestEnvironment();
		const upkeepIndex = phases.findIndex(
			(phase) => phase.id === ids.phases.upkeep,
		);
		const warStepIndex = phases[upkeepIndex]!.steps.findIndex(
			(step) => step.id === ids.steps.warRecovery,
		);
		ctx.game.phaseIndex = upkeepIndex;
		ctx.game.currentPhase = ids.phases.upkeep;
		ctx.game.stepIndex = warStepIndex;
		ctx.game.currentStep = ids.steps.warRecovery;
		ctx.activePlayer.stats[stats.war] = 0;
		advance(ctx);
		ctx.game.currentPlayerIndex = 0;
		expect(ctx.activePlayer.stats[stats.war]).toBe(0);
	});
});
