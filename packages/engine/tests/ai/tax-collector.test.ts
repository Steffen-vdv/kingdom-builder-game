import { describe, it, expect, vi } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import {
	SESSION_AI_ACTION_LOG_KEY,
	type SessionAiActionLogEntry,
} from '@kingdom-builder/protocol';
import { performAction, advance } from '../../src';
import {
	createTaxCollectorController,
	TAX_ACTION_ID,
} from '../../src/ai/index';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from '../helpers';

describe('tax collector AI controller', () => {
	it('collects tax until action points are spent then ends the turn', async () => {
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

		const initialTurn = engineContext.game.turn;

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
		});

		expect(perform).toHaveBeenCalledTimes(1);
		expect(perform).toHaveBeenNthCalledWith(1, TAX_ACTION_ID, engineContext);
		expect(engineContext.activePlayer.resources[apKey]).toBe(1);
		expect(endPhase).not.toHaveBeenCalled();
		const firstLogs = engineContext.drainEffectLogs();
		const initialEntries = firstLogs.get(SESSION_AI_ACTION_LOG_KEY) ?? [];
		expect(initialEntries).toHaveLength(1);
		const [firstEntry] = initialEntries as SessionAiActionLogEntry[];
		expect(firstEntry.turn).toBe(initialTurn);
		expect(firstEntry.sequence).toBe(0);
		expect(firstEntry.traces).toHaveLength(1);

		await controller(engineContext, {
			performAction: perform,
			advance: endPhase,
		});

		expect(perform).toHaveBeenCalledTimes(2);
		expect(perform).toHaveBeenNthCalledWith(2, TAX_ACTION_ID, engineContext);
		expect(engineContext.activePlayer.resources[apKey]).toBe(0);
		expect(endPhase).toHaveBeenCalledTimes(1);
		const secondLogs = engineContext.drainEffectLogs();
		const followupEntries = secondLogs.get(SESSION_AI_ACTION_LOG_KEY) ?? [];
		expect(followupEntries).toHaveLength(1);
		const [secondEntry] = followupEntries as SessionAiActionLogEntry[];
		expect(secondEntry.turn).toBe(initialTurn);
		expect(secondEntry.sequence).toBe(1);
		expect(secondEntry.traces).toHaveLength(1);
		expect(engineContext.game.turn).toBe(initialTurn + 1);
	});
});
