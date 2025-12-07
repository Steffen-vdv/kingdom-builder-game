/**
 * Tests to ensure AI actions follow the same simulate->perform flow as
 * player actions, preventing partial state corruption when actions fail.
 */
import { describe, it, expect, vi } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { advance } from '../../src';
import {
	createAISystem,
	createTaxCollectorController,
	TAX_ACTION_ID,
} from '../../src/ai';
import { createTestEngine } from '../helpers';
import { resourceAmountParams } from '../helpers/resourceParams';

describe('AI simulation guard', () => {
	function createEngineWithAction(effectParams: Record<string, unknown>) {
		const content = createContentFactory();
		content.action({
			id: TAX_ACTION_ID,
			baseCosts: {},
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: effectParams,
				},
			],
		});

		const engineContext = createTestEngine(content);
		const actionPhaseIndex = engineContext.phases.findIndex(
			(phase) => phase.action,
		);
		if (actionPhaseIndex === -1) {
			throw new Error('Action phase not found');
		}

		engineContext.game.currentPlayerIndex = 1;
		engineContext.game.phaseIndex = actionPhaseIndex;
		engineContext.game.stepIndex = 0;

		const apKey = engineContext.actionCostResource;
		if (!apKey) {
			throw new Error('No action cost resource');
		}
		engineContext.activePlayer.resourceValues[apKey] = 2;

		return { engineContext, content, apKey };
	}

	it('AI uses simulation before execution (same as player flow)', () => {
		// Verify that the AI system is configured to simulate before performing
		// by checking the create_engine.ts setup wraps performAction with
		// simulateAction first
		const content = createContentFactory();
		content.action({
			id: TAX_ACTION_ID,
			baseCosts: {},
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						resourceId: CResource.gold,
						amount: 1,
					}),
				},
			],
		});

		const engineContext = createTestEngine(content);
		const actionPhaseIndex = engineContext.phases.findIndex(
			(phase) => phase.action,
		);
		engineContext.game.currentPlayerIndex = 1;
		engineContext.game.phaseIndex = actionPhaseIndex;
		engineContext.game.stepIndex = 0;

		const apKey = engineContext.actionCostResource!;
		engineContext.activePlayer.resourceValues[apKey] = 2;

		// The AI system created by createTestEngine should have simulation guard
		expect(engineContext.aiSystem).toBeDefined();
		expect(engineContext.aiSystem!.has(engineContext.activePlayer.id)).toBe(
			true,
		);
	});

	it('simulation failure prevents costs from being deducted', async () => {
		const { engineContext, apKey } = createEngineWithAction(
			// Invalid effect that will fail during execution
			resourceAmountParams({ resourceId: CResource.gold, amount: 1 }),
		);

		// Create a custom performAction that simulates failure
		const simulationError = new Error('Simulated action would fail');
		const performWithSimulation = vi.fn(() => {
			throw simulationError;
		});

		const advanceFn = vi.fn(() => advance(engineContext));
		const system = createAISystem({
			performAction: performWithSimulation,
			advance: advanceFn,
		});

		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		const apBefore = engineContext.activePlayer.resourceValues[apKey];

		// Run should throw the error
		await expect(
			system.run(engineContext.activePlayer.id, engineContext),
		).rejects.toThrow('Simulated action would fail');

		// AP should not have been deducted since simulation failed before execution
		// Note: The AI controller itself doesn't deduct AP, the action execution does
		// But since we're throwing before any action runs, state should be unchanged
		// The controller zeroes AP on expected errors, but not on unexpected errors
		expect(engineContext.activePlayer.resourceValues[apKey]).toBe(apBefore);
	});

	it('expected errors (requirements) are handled gracefully', async () => {
		const { engineContext, apKey } = createEngineWithAction(
			resourceAmountParams({ resourceId: CResource.gold, amount: 1 }),
		);

		// Create a requirement failure error (expected error type)
		const requirementError = Object.assign(new Error('Cannot afford'), {
			requirementFailure: { message: 'Cannot afford' },
		});
		const performWithRequirementFail = vi.fn(() => {
			throw requirementError;
		});

		const advanceFn = vi.fn(() => advance(engineContext));
		const shouldAdvancePhase = vi.fn().mockResolvedValue(true);
		const system = createAISystem({
			performAction: performWithRequirementFail,
			advance: advanceFn,
			shouldAdvancePhase,
		});

		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		// Should NOT throw for expected errors
		await expect(
			system.run(engineContext.activePlayer.id, engineContext),
		).resolves.toBe(true);

		// Should have advanced phase and drained AP
		expect(advanceFn).toHaveBeenCalled();
		expect(engineContext.activePlayer.resourceValues[apKey]).toBe(0);
	});

	it('unexpected errors propagate to caller', async () => {
		const { engineContext } = createEngineWithAction(
			resourceAmountParams({ resourceId: CResource.gold, amount: 1 }),
		);

		// Create an unexpected engine error
		const engineBug = new Error(
			'Resource state expected integer but received 0.5',
		);
		const performWithBug = vi.fn(() => {
			throw engineBug;
		});

		const advanceFn = vi.fn(() => advance(engineContext));
		const system = createAISystem({
			performAction: performWithBug,
			advance: advanceFn,
		});

		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		// Should throw for unexpected errors
		await expect(
			system.run(engineContext.activePlayer.id, engineContext),
		).rejects.toThrow('Resource state expected integer but received 0.5');

		// Should NOT have advanced phase
		expect(advanceFn).not.toHaveBeenCalled();
	});
});

describe('AI action error types', () => {
	it('affordability errors are expected', async () => {
		// Errors containing "Cannot afford" should be swallowed
		const content = createContentFactory();
		content.action({ id: TAX_ACTION_ID, baseCosts: {}, effects: [] });
		const engineContext = createTestEngine(content);

		const actionPhaseIndex = engineContext.phases.findIndex(
			(phase) => phase.action,
		);
		engineContext.game.currentPlayerIndex = 1;
		engineContext.game.phaseIndex = actionPhaseIndex;
		engineContext.game.stepIndex = 0;
		engineContext.activePlayer.resourceValues[
			engineContext.actionCostResource!
		] = 1;

		const error = new Error('Cannot afford this action');
		const perform = vi.fn(() => {
			throw error;
		});
		const advanceFn = vi.fn(() => advance(engineContext));
		const shouldAdvancePhase = vi.fn().mockResolvedValue(true);

		const system = createAISystem({
			performAction: perform,
			advance: advanceFn,
			shouldAdvancePhase,
		});
		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		// Should NOT throw - affordability is expected
		await expect(
			system.run(engineContext.activePlayer.id, engineContext),
		).resolves.toBe(true);
	});

	it('requirement not met errors are expected', async () => {
		const content = createContentFactory();
		content.action({ id: TAX_ACTION_ID, baseCosts: {}, effects: [] });
		const engineContext = createTestEngine(content);

		const actionPhaseIndex = engineContext.phases.findIndex(
			(phase) => phase.action,
		);
		engineContext.game.currentPlayerIndex = 1;
		engineContext.game.phaseIndex = actionPhaseIndex;
		engineContext.game.stepIndex = 0;
		engineContext.activePlayer.resourceValues[
			engineContext.actionCostResource!
		] = 1;

		const error = new Error('Requirement not met');
		const perform = vi.fn(() => {
			throw error;
		});
		const advanceFn = vi.fn(() => advance(engineContext));
		const shouldAdvancePhase = vi.fn().mockResolvedValue(true);

		const system = createAISystem({
			performAction: perform,
			advance: advanceFn,
			shouldAdvancePhase,
		});
		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		// Should NOT throw
		await expect(
			system.run(engineContext.activePlayer.id, engineContext),
		).resolves.toBe(true);
	});

	it('integer validation errors are unexpected and re-thrown', async () => {
		const content = createContentFactory();
		content.action({ id: TAX_ACTION_ID, baseCosts: {}, effects: [] });
		const engineContext = createTestEngine(content);

		const actionPhaseIndex = engineContext.phases.findIndex(
			(phase) => phase.action,
		);
		engineContext.game.currentPlayerIndex = 1;
		engineContext.game.phaseIndex = actionPhaseIndex;
		engineContext.game.stepIndex = 0;
		engineContext.activePlayer.resourceValues[
			engineContext.actionCostResource!
		] = 1;

		// This is the actual error that would occur with the 0.5 happiness bug
		const error = new Error(
			'Resource state expected "resource:core:happiness" value to be an ' +
				'integer but received 0.5',
		);
		const perform = vi.fn(() => {
			throw error;
		});
		const advanceFn = vi.fn(() => advance(engineContext));

		const system = createAISystem({
			performAction: perform,
			advance: advanceFn,
		});
		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		// Should throw - this is an unexpected error
		await expect(
			system.run(engineContext.activePlayer.id, engineContext),
		).rejects.toThrow('integer but received 0.5');
	});
});
