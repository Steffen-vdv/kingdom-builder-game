import { describe, it, expect, vi } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import { performAction, advance } from '../../src';
import {
	createTaxCollectorController,
	TAX_ACTION_ID,
} from '../../src/ai/index';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from '../helpers';

describe('tax collector AI controller', () => {
	function createControllerFixture(actionPoints: number = 2) {
		const content = createContentFactory();
		content.action({
			id: TAX_ACTION_ID,
			baseCosts: { [CResource.ap]: 1 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: CResource.gold, amount: 1 },
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
		engineContext.activePlayer.resources[apKey] = actionPoints;

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
		expect(engineContext.activePlayer.resources[apKey]).toBe(0);
		expect(endPhase).toHaveBeenCalledTimes(1);
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
		expect(engineContext.activePlayer.resources[apKey]).toBe(1);
	});

	it('finishes the phase if continuation declines with no AP remaining', async () => {
		const { engineContext, apKey, controller } = createControllerFixture(1);
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
		expect(shouldAdvancePhase).toHaveBeenCalledTimes(1);
		expect(shouldAdvancePhase).toHaveBeenCalledWith(engineContext);
		expect(engineContext.activePlayer.resources[apKey]).toBe(0);
		expect(endPhase).toHaveBeenCalledTimes(1);
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
		expect(engineContext.activePlayer.resources[apKey]).toBe(0);
	});
});
