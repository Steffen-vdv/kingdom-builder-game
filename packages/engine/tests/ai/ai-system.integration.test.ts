import { describe, it, expect, vi } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { performAction, advance } from '../../src';
import {
	createAISystem,
	createTaxCollectorController,
	TAX_ACTION_ID,
} from '../../src/ai/index';
import { createTestEngine } from '../helpers';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

describe('AISystem with tax collector controller', () => {
	type ActionOverrides = Partial<
		Parameters<ReturnType<typeof createContentFactory>['action']>[0]
	>;

	function createEngineFixture(
		actionPoints = 2,
		options: { playerIndex?: number; action?: ActionOverrides } = {},
	) {
		const { playerIndex = 1, action = {} } = options;
		const content = createContentFactory();
		content.action({
			id: TAX_ACTION_ID,
			baseCosts: { [CResource.ap]: 1 },
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
			...action,
		});

		const engineContext = createTestEngine(content);
		const actionPhaseIndex = engineContext.phases.findIndex(
			(phase) => phase.action,
		);
		if (actionPhaseIndex === -1) {
			throw new Error('Action phase not found');
		}

		engineContext.game.currentPlayerIndex = playerIndex;
		engineContext.game.phaseIndex = actionPhaseIndex;
		engineContext.game.stepIndex = 0;
		engineContext.game.currentPhase =
			engineContext.phases[actionPhaseIndex]!.id;
		engineContext.game.currentStep =
			engineContext.phases[actionPhaseIndex]!.steps[0]?.id ?? '';

		const apKey = engineContext.actionCostResource;
		engineContext.activePlayer.resources[apKey] = actionPoints;
		engineContext.activePlayer.actions.add(TAX_ACTION_ID);

		return { engineContext, apKey, actionPhaseIndex } as const;
	}

	it('runs registered controller draining AP and advancing phase', async () => {
		const { engineContext, apKey, actionPhaseIndex } = createEngineFixture(2);
		const perform = vi.fn((actionId: string) =>
			performAction(actionId, engineContext),
		);
		const advancePhase = vi.fn(() => advance(engineContext));
		const system = createAISystem({
			performAction: perform,
			advance: advancePhase,
		});
		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		const continueAfterAction = vi.fn().mockResolvedValue(true);
		const shouldAdvancePhase = vi.fn().mockResolvedValue(true);

		const result = await system.run(
			engineContext.activePlayer.id,
			engineContext,
			{
				continueAfterAction,
				shouldAdvancePhase,
			},
		);

		expect(result).toBe(true);
		expect(perform).toHaveBeenCalledTimes(2);
		expect(continueAfterAction).toHaveBeenCalledTimes(2);
		expect(shouldAdvancePhase).toHaveBeenCalledTimes(1);
		expect(advancePhase).toHaveBeenCalledTimes(1);
		expect(engineContext.activePlayer.resources[apKey]).toBe(0);
		expect(engineContext.game.phaseIndex).not.toBe(actionPhaseIndex);
	});

	it('returns false when no controller is registered', async () => {
		const { engineContext } = createEngineFixture();
		const perform = vi.fn();
		const advancePhase = vi.fn();
		const system = createAISystem({
			performAction: perform,
			advance: advancePhase,
		});

		const result = await system.run(
			engineContext.activePlayer.id,
			engineContext,
		);

		expect(result).toBe(false);
		expect(perform).not.toHaveBeenCalled();
		expect(advancePhase).not.toHaveBeenCalled();
	});

	it('skips controllers when not the active player', async () => {
		const { engineContext } = createEngineFixture();
		const perform = vi.fn();
		const advancePhase = vi.fn();
		const system = createAISystem({
			performAction: perform,
			advance: advancePhase,
		});
		const inactiveId = engineContext.opponent.id;
		const controller = createTaxCollectorController(inactiveId);
		system.register(inactiveId, controller);

		const result = await system.run(inactiveId, engineContext);

		expect(result).toBe(true);
		expect(perform).not.toHaveBeenCalled();
		expect(advancePhase).not.toHaveBeenCalled();
	});

	it('returns early when the current phase has no actions', async () => {
		const { engineContext } = createEngineFixture(2, { playerIndex: 0 });
		const perform = vi.fn();
		const advancePhase = vi.fn();
		const system = createAISystem({
			performAction: perform,
			advance: advancePhase,
		});
		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		const phaseIndex = engineContext.phases.findIndex((phase) => !phase.action);
		if (phaseIndex === -1) {
			throw new Error('Non-action phase not found');
		}
		engineContext.game.phaseIndex = phaseIndex;
		engineContext.game.currentPhase = engineContext.phases[phaseIndex]!.id;
		engineContext.game.currentStep =
			engineContext.phases[phaseIndex]!.steps[0]?.id ?? '';

		await system.run(engineContext.activePlayer.id, engineContext);

		expect(perform).not.toHaveBeenCalled();
		expect(advancePhase).not.toHaveBeenCalled();
	});

	it('returns early when action points resource is undefined', async () => {
		const { engineContext } = createEngineFixture();
		const perform = vi.fn();
		const advancePhase = vi.fn();
		const system = createAISystem({
			performAction: perform,
			advance: advancePhase,
		});
		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		engineContext.actionCostResource = '' as unknown as string;

		await system.run(engineContext.activePlayer.id, engineContext);

		expect(perform).not.toHaveBeenCalled();
		expect(advancePhase).not.toHaveBeenCalled();
	});

	it('finishes the phase when the tax action is locked to the system', async () => {
		const { engineContext, apKey } = createEngineFixture(2, {
			action: { system: true },
		});
		const perform = vi.fn();
		const advancePhase = vi.fn(() => advance(engineContext));
		const shouldAdvancePhase = vi.fn().mockResolvedValue(true);
		const system = createAISystem({
			performAction: perform,
			advance: advancePhase,
			shouldAdvancePhase,
		});
		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		engineContext.activePlayer.actions.delete(TAX_ACTION_ID);

		await system.run(engineContext.activePlayer.id, engineContext);

		expect(perform).not.toHaveBeenCalled();
		expect(shouldAdvancePhase).toHaveBeenCalledTimes(1);
		expect(advancePhase).toHaveBeenCalledTimes(1);
		expect(engineContext.activePlayer.resources[apKey]).toBe(0);
	});

	it('terminates the loop when continuation declines further actions', async () => {
		const { engineContext, apKey } = createEngineFixture(3);
		const perform = vi.fn((actionId: string) =>
			performAction(actionId, engineContext),
		);
		const advancePhase = vi.fn();
		const continueAfterAction = vi.fn().mockResolvedValueOnce(false);
		const system = createAISystem({
			performAction: perform,
			advance: advancePhase,
		});
		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		await system.run(engineContext.activePlayer.id, engineContext, {
			continueAfterAction,
		});

		expect(perform).toHaveBeenCalledTimes(1);
		expect(continueAfterAction).toHaveBeenCalledTimes(1);
		expect(advancePhase).not.toHaveBeenCalled();
		expect(engineContext.activePlayer.resources[apKey]).toBe(2);
	});

	it('recovers from action errors by draining AP and advancing', async () => {
		const { engineContext, apKey } = createEngineFixture(2);
		const error = new Error('boom');
		const perform = vi.fn(() => {
			throw error;
		});
		const advancePhase = vi.fn(() => advance(engineContext));
		const shouldAdvancePhase = vi.fn().mockResolvedValue(true);
		const system = createAISystem({
			performAction: perform,
			advance: advancePhase,
			shouldAdvancePhase,
		});
		const controller = createTaxCollectorController(
			engineContext.activePlayer.id,
		);
		system.register(engineContext.activePlayer.id, controller);

		await system.run(engineContext.activePlayer.id, engineContext);

		expect(perform).toHaveBeenCalledTimes(1);
		expect(shouldAdvancePhase).toHaveBeenCalledTimes(1);
		expect(advancePhase).toHaveBeenCalledTimes(1);
		expect(engineContext.activePlayer.resources[apKey]).toBe(0);
	});
});
