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
	it('collects tax one action at a time before ending the turn', async () => {
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
		engineContext.activePlayer.resources[apKey] = 2;

		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		const perform = vi.fn((actionId: string) =>
			performAction(actionId, engineContext),
		);
		const endPhase = vi.fn(() => advance(engineContext));

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
		});

		expect(perform).toHaveBeenCalledTimes(1);
		expect(perform).toHaveBeenLastCalledWith(TAX_ACTION_ID, engineContext);
		expect(engineContext.activePlayer.resources[apKey]).toBe(1);
		expect(endPhase).not.toHaveBeenCalled();

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
		});

		expect(perform).toHaveBeenCalledTimes(2);
		expect(perform).toHaveBeenLastCalledWith(TAX_ACTION_ID, engineContext);
		expect(engineContext.activePlayer.resources[apKey]).toBe(0);
		expect(endPhase).not.toHaveBeenCalled();

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
		});

		expect(perform).toHaveBeenCalledTimes(2);
		expect(endPhase).toHaveBeenCalledTimes(1);
	});
});
