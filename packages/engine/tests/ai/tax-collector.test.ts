import { describe, it, expect, vi } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import { performAction, advance } from '../../src';
import {
  createTaxCollectorController,
  TAX_ACTION_ID,
} from '../../src/ai/index';
import { createContentFactory } from '../factories/content';
import { createTestEngine } from '../helpers';

describe('tax collector AI controller', () => {
  it('collects tax until action points are spent then ends the turn', () => {
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

    const ctx = createTestEngine(content);
    const actionPhaseIndex = ctx.phases.findIndex((phase) => phase.action);
    if (actionPhaseIndex === -1) throw new Error('Action phase not found');

    ctx.game.currentPlayerIndex = 1;
    ctx.game.phaseIndex = actionPhaseIndex;
    ctx.game.stepIndex = 0;
    ctx.game.currentPhase = ctx.phases[actionPhaseIndex]!.id;
    ctx.game.currentStep = ctx.phases[actionPhaseIndex]!.steps[0]?.id ?? '';

    const apKey = ctx.actionCostResource;
    ctx.activePlayer.resources[apKey] = 2;

    const controller = createTaxCollectorController(ctx.activePlayer.id);
    const perform = vi.fn((actionId: string) => performAction(actionId, ctx));
    const endPhase = vi.fn(() => advance(ctx));

    void controller(ctx, { performAction: perform, advance: endPhase });

    expect(perform).toHaveBeenCalledTimes(2);
    expect(perform).toHaveBeenNthCalledWith(1, TAX_ACTION_ID, ctx);
    expect(perform).toHaveBeenNthCalledWith(2, TAX_ACTION_ID, ctx);
    expect(ctx.activePlayer.resources[apKey]).toBe(0);
    expect(endPhase).toHaveBeenCalledTimes(1);
  });
});
