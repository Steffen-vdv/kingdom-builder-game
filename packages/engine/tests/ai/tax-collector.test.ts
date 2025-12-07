import { describe, it, expect, vi } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import { performAction, advance } from '../../src';
import {
	createTaxCollectorController,
	TAX_ACTION_ID,
} from '../../src/ai/index';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from '../helpers';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

describe('tax collector AI controller', () => {
	function createControllerFixture(actionPoints: number = 2) {
		const content = createContentFactory();
		content.action({
			id: TAX_ACTION_ID,
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						key: CResource.gold,
						amount: 1,
					}),
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
		engineContext.game.currentPhase =
			engineContext.phases[actionPhaseIndex]!.id;
		engineContext.game.currentStep =
			engineContext.phases[actionPhaseIndex]!.steps[0]?.id ?? '';

		const apKey = engineContext.actionCostResource;
		// PlayerState uses resourceValues, not resources
		engineContext.activePlayer.resourceValues[apKey] = actionPoints;

		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);

		return { engineContext, apKey, controller } as const;
	}

	it('collects tax until AP are spent then ends the turn', async () => {
		const { engineContext, apKey, controller } = createControllerFixture();
		const perform = vi.fn((actionId: string) =>
			performAction(actionId, engineContext),
		);
		const endPhase = vi.fn(() => advance(engineContext));

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
		});

		expect(perform).toHaveBeenCalledTimes(2);
		expect(perform).toHaveBeenNthCalledWith(1, TAX_ACTION_ID, engineContext);
		expect(perform).toHaveBeenNthCalledWith(2, TAX_ACTION_ID, engineContext);
		expect(engineContext.activePlayer.resourceValues[apKey]).toBe(0);
		expect(endPhase).toHaveBeenCalledTimes(1);
	});

	it('ignores turns when another player is active', async () => {
		const { engineContext, controller } = createControllerFixture();
		engineContext.game.currentPlayerIndex = 0;
		const perform = vi.fn();
		const advanceSpy = vi.fn();

		await controller(engineContext, {
			performAction: perform,
			advance: advanceSpy,
		});

		expect(perform).not.toHaveBeenCalled();
		expect(advanceSpy).not.toHaveBeenCalled();
	});

	it('returns early when the current phase lacks an action step', async () => {
		const { engineContext, controller } = createControllerFixture();
		const noActionIndex = engineContext.phases.findIndex(
			(phase) => !phase.action,
		);
		if (noActionIndex === -1) {
			throw new Error('No non-action phase defined');
		}
		engineContext.game.phaseIndex = noActionIndex;
		engineContext.game.currentPhase = engineContext.phases[noActionIndex]!.id;
		engineContext.game.currentStep =
			engineContext.phases[noActionIndex]!.steps[0]?.id ?? '';

		const perform = vi.fn();
		const advanceSpy = vi.fn();

		await controller(engineContext, {
			performAction: perform,
			advance: advanceSpy,
		});

		expect(perform).not.toHaveBeenCalled();
		expect(advanceSpy).not.toHaveBeenCalled();
	});

	// Note: actionCostResource is now a derived getter from action costs,
	// so it cannot be set to empty. This edge case no longer applies.
	it.skip('skips when the action point resource key is missing', async () => {
		const { engineContext, controller } = createControllerFixture();
		// engineContext.actionCostResource is now read-only (derived from actions)
		const perform = vi.fn();
		const advanceSpy = vi.fn();

		await controller(engineContext, {
			performAction: perform,
			advance: advanceSpy,
		});

		expect(perform).not.toHaveBeenCalled();
		expect(advanceSpy).not.toHaveBeenCalled();
	});

	it('stops when continuation declines without advancing', async () => {
		const { engineContext, apKey, controller } = createControllerFixture();
		const perform = vi.fn((actionId: string) =>
			performAction(actionId, engineContext),
		);
		const continueAfterAction = vi.fn().mockResolvedValueOnce(false);
		const shouldAdvancePhase = vi.fn().mockResolvedValue(true);
		const endPhase = vi.fn(() => advance(engineContext));

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
			continueAfterAction,
			shouldAdvancePhase,
		});

		expect(perform).toHaveBeenCalledTimes(1);
		expect(continueAfterAction).toHaveBeenCalledTimes(1);
		expect(continueAfterAction).toHaveBeenNthCalledWith(
			1,
			TAX_ACTION_ID,
			engineContext,
			expect.anything(),
		);
		expect(shouldAdvancePhase).not.toHaveBeenCalled();
		expect(endPhase).not.toHaveBeenCalled();
		expect(engineContext.activePlayer.resourceValues[apKey]).toBe(1);
	});

	it('continues through the full turn when callbacks allow', async () => {
		const { engineContext, apKey, controller } = createControllerFixture();
		const perform = vi.fn((actionId: string) =>
			performAction(actionId, engineContext),
		);
		const continueAfterAction = vi.fn().mockResolvedValue(true);
		const shouldAdvancePhase = vi.fn().mockResolvedValue(true);
		const endPhase = vi.fn(() => advance(engineContext));

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
			continueAfterAction,
			shouldAdvancePhase,
		});

		expect(perform).toHaveBeenCalledTimes(2);
		expect(continueAfterAction).toHaveBeenCalledTimes(2);
		expect(continueAfterAction).toHaveBeenNthCalledWith(
			1,
			TAX_ACTION_ID,
			engineContext,
			expect.anything(),
		);
		expect(continueAfterAction).toHaveBeenNthCalledWith(
			2,
			TAX_ACTION_ID,
			engineContext,
			expect.anything(),
		);
		expect(shouldAdvancePhase).toHaveBeenCalledTimes(1);
		expect(shouldAdvancePhase).toHaveBeenCalledWith(engineContext);
		expect(endPhase).toHaveBeenCalledTimes(1);
		expect(engineContext.activePlayer.resourceValues[apKey]).toBe(0);
	});

	it('advances the phase when the tax action definition is missing', async () => {
		const { engineContext, apKey, controller } = createControllerFixture();
		engineContext.actions.remove(TAX_ACTION_ID);
		const perform = vi.fn();
		const shouldAdvancePhase = vi.fn().mockResolvedValue(true);
		const endPhase = vi.fn(() => advance(engineContext));

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
			shouldAdvancePhase,
		});

		expect(perform).not.toHaveBeenCalled();
		expect(shouldAdvancePhase).toHaveBeenCalledWith(engineContext);
		expect(endPhase).toHaveBeenCalledTimes(1);
		// After phase advances, player may change so AP could be undefined
		expect(engineContext.activePlayer.resourceValues[apKey] ?? 0).toBe(0);
	});

	it('advances when system-only tax action is unavailable to the player', async () => {
		const { engineContext, apKey, controller } = createControllerFixture();
		const definition = engineContext.actions.get(TAX_ACTION_ID);
		if (!definition) {
			throw new Error('Tax action not found');
		}
		definition.system = true;
		engineContext.activePlayer.actions.delete(TAX_ACTION_ID);
		const perform = vi.fn();
		const shouldAdvancePhase = vi.fn().mockResolvedValue(true);
		const endPhase = vi.fn(() => advance(engineContext));

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
			shouldAdvancePhase,
		});

		expect(perform).not.toHaveBeenCalled();
		expect(shouldAdvancePhase).toHaveBeenCalledWith(engineContext);
		expect(endPhase).toHaveBeenCalledTimes(1);
		// After phase advances, player may change so AP could be undefined
		expect(engineContext.activePlayer.resourceValues[apKey] ?? 0).toBe(0);
	});

	it('clears remaining AP without advancing when phase advancement is denied', async () => {
		const { engineContext, apKey, controller } = createControllerFixture();
		const perform = vi.fn((actionId: string) =>
			performAction(actionId, engineContext),
		);
		const shouldAdvancePhase = vi.fn().mockResolvedValue(false);
		const endPhase = vi.fn();

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
			shouldAdvancePhase,
		});

		expect(perform).toHaveBeenCalledTimes(2);
		expect(shouldAdvancePhase).toHaveBeenCalledTimes(1);
		expect(endPhase).not.toHaveBeenCalled();
		expect(engineContext.activePlayer.resourceValues[apKey]).toBe(0);
	});

	it('finishes the phase when performAction throws', async () => {
		const { engineContext, apKey, controller } = createControllerFixture();
		const perform = vi.fn().mockRejectedValue(new Error('fail'));
		const shouldAdvancePhase = vi.fn().mockResolvedValue(true);
		const endPhase = vi.fn(() => advance(engineContext));

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
			shouldAdvancePhase,
		});

		expect(perform).toHaveBeenCalledTimes(1);
		expect(endPhase).toHaveBeenCalledTimes(1);
		// After phase advances, player may change so AP could be undefined
		expect(engineContext.activePlayer.resourceValues[apKey] ?? 0).toBe(0);
	});
});
