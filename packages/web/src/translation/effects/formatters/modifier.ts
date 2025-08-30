import { actionInfo, modifierInfo } from '../../../icons';
import { RESOURCES } from '@kingdom-builder/engine';
import type { ResourceKey } from '@kingdom-builder/engine';
import { increaseOrDecrease, signed } from '../helpers';
import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
} from '../factory';

registerEffectFormatter('cost_mod', 'add', {
  summarize: (eff, _ctx) => {
    const key = eff.params?.['key'] as string;
    const icon = RESOURCES[key as ResourceKey]?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const actionId = eff.params?.['actionId'] as string;
    const actionIcon =
      actionInfo[actionId as keyof typeof actionInfo]?.icon || actionId;
    return `${modifierInfo.cost.icon} ${actionIcon}: ${icon}${signed(amount)}${amount}`;
  },
  describe: (eff, ctx) => {
    const key = eff.params?.['key'] as string;
    const icon = RESOURCES[key as ResourceKey]?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const actionId = eff.params?.['actionId'] as string;
    const actionIcon =
      actionInfo[actionId as keyof typeof actionInfo]?.icon || actionId;
    const actionName = ctx.actions.get(actionId)?.name || actionId;
    return `${modifierInfo.cost.icon} ${modifierInfo.cost.label} on ${actionIcon} ${actionName}: ${increaseOrDecrease(amount)} cost by ${icon}${Math.abs(amount)}`;
  },
});

registerEffectFormatter('result_mod', 'add', {
  summarize: (eff, ctx) => {
    const sub = summarizeEffects(eff.effects || [], ctx);
    const actionId = eff.params?.['actionId'] as string;
    const actionIcon =
      actionInfo[actionId as keyof typeof actionInfo]?.icon || actionId;
    return sub.map((s) => `${modifierInfo.result.icon} ${actionIcon}: ${s}`);
  },
  describe: (eff, ctx) => {
    const sub = describeEffects(eff.effects || [], ctx);
    const actionId = eff.params?.['actionId'] as string;
    const actionIcon =
      actionInfo[actionId as keyof typeof actionInfo]?.icon || actionId;
    const actionName = ctx.actions.get(actionId)?.name || actionId;
    return sub.map(
      (s) =>
        `${modifierInfo.result.icon} ${modifierInfo.result.label} on ${actionIcon} ${actionName}: ${s}`,
    );
  },
});
