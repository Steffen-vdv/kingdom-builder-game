import { describe, it, expect } from 'vitest';
import { advance } from '../../src/index.ts';
import { createPhaseTestEnvironment } from './fixtures.ts';

describe('Upkeep phase', () => {
	it('charges gold per population role', () => {
		const { engineContext, phases, ids, roles, resources, values } =
			createPhaseTestEnvironment();
		const upkeepIndex = phases.findIndex(
			(phase) => phase.id === ids.phases.upkeep,
		);
		const payStepIndex = phases[upkeepIndex]!.steps.findIndex(
			(step) => step.id === ids.steps.payUpkeep,
		);
		engineContext.game.phaseIndex = upkeepIndex;
		engineContext.game.currentPhase = ids.phases.upkeep;
		engineContext.game.stepIndex = payStepIndex;
		engineContext.game.currentStep = ids.steps.payUpkeep;
		// All resource/population/stat keys ARE Resource IDs - use resourceValues
		engineContext.activePlayer.resourceValues[roles.legion] = 1;
		engineContext.activePlayer.resourceValues[roles.fortifier] = 1;
		const startGold = 5;
		engineContext.activePlayer.resourceValues[resources.gold] = startGold;
		const councils = engineContext.activePlayer.resourceValues[roles.council];
		const player = engineContext.activePlayer;
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const expectedGold =
			startGold -
			(values.upkeep.council * councils +
				values.upkeep.legion +
				values.upkeep.fortifier);
		expect(player.resourceValues[resources.gold]).toBe(expectedGold);
	});

	it('clamps gold to zero when upkeep exceeds available gold', () => {
		// Resource uses clamp reconciliation by default - insufficient funds
		// result in clamping to lower bound (0), not throwing an error
		const { engineContext, phases, ids, roles, resources, values } =
			createPhaseTestEnvironment();
		const upkeepIndex = phases.findIndex(
			(phase) => phase.id === ids.phases.upkeep,
		);
		const payStepIndex = phases[upkeepIndex]!.steps.findIndex(
			(step) => step.id === ids.steps.payUpkeep,
		);
		engineContext.game.phaseIndex = upkeepIndex;
		engineContext.game.currentPhase = ids.phases.upkeep;
		engineContext.game.stepIndex = payStepIndex;
		engineContext.game.currentStep = ids.steps.payUpkeep;
		// All resource/population/stat keys ARE Resource IDs - use resourceValues
		engineContext.activePlayer.resourceValues[roles.legion] = 1;
		const councils = engineContext.activePlayer.resourceValues[roles.council];
		const totalCost = values.upkeep.council * councils + values.upkeep.legion;
		engineContext.activePlayer.resourceValues[resources.gold] = totalCost - 1;
		advance(engineContext);
		// Gold should be clamped to 0 (the lower bound)
		expect(engineContext.activePlayer.resourceValues[resources.gold]).toBe(0);
	});

	it('reduces war weariness by 1 when above 0', () => {
		const { engineContext, phases, ids, stats } = createPhaseTestEnvironment();
		const upkeepIndex = phases.findIndex(
			(phase) => phase.id === ids.phases.upkeep,
		);
		const warStepIndex = phases[upkeepIndex]!.steps.findIndex(
			(step) => step.id === ids.steps.warRecovery,
		);
		engineContext.game.phaseIndex = upkeepIndex;
		engineContext.game.currentPhase = ids.phases.upkeep;
		engineContext.game.stepIndex = warStepIndex;
		engineContext.game.currentStep = ids.steps.warRecovery;
		// Stat keys ARE Resource IDs - use resourceValues
		engineContext.activePlayer.resourceValues[stats.war] = 2;
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		expect(engineContext.activePlayer.resourceValues[stats.war]).toBe(1);
	});

	it('does not drop war weariness below zero', () => {
		const { engineContext, phases, ids, stats } = createPhaseTestEnvironment();
		const upkeepIndex = phases.findIndex(
			(phase) => phase.id === ids.phases.upkeep,
		);
		const warStepIndex = phases[upkeepIndex]!.steps.findIndex(
			(step) => step.id === ids.steps.warRecovery,
		);
		engineContext.game.phaseIndex = upkeepIndex;
		engineContext.game.currentPhase = ids.phases.upkeep;
		engineContext.game.stepIndex = warStepIndex;
		engineContext.game.currentStep = ids.steps.warRecovery;
		// Stat keys ARE Resource IDs - use resourceValues
		engineContext.activePlayer.resourceValues[stats.war] = 0;
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		expect(engineContext.activePlayer.resourceValues[stats.war]).toBe(0);
	});
});
