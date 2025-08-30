import {
  ACTION_INFO as actionInfo,
  MODIFIER_INFO as modifierInfo,
  DEVELOPMENT_INFO as developmentInfo,
  RESOURCES,
} from '@kingdom-builder/contents';
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
    const actionIcon = actionInfo[actionId]?.icon || actionId;
    return `${modifierInfo.cost.icon} ${actionIcon}: ${icon}${signed(amount)}${amount}`;
  },
  describe: (eff, ctx) => {
    const key = eff.params?.['key'] as string;
    const icon = RESOURCES[key as ResourceKey]?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const actionId = eff.params?.['actionId'] as string;
    const actionIcon = actionInfo[actionId]?.icon || actionId;
    const actionName = ctx.actions.get(actionId)?.name || actionId;
    return `${modifierInfo.cost.icon} ${modifierInfo.cost.label} on ${actionIcon} ${actionName}: ${increaseOrDecrease(amount)} cost by ${icon}${Math.abs(amount)}`;
  },
});

registerEffectFormatter('result_mod', 'add', {
  summarize: (eff, ctx) => {
    const sub = summarizeEffects(eff.effects || [], ctx);
    const evaluation = eff.params?.['evaluation'] as
      | { type: string; id: string }
      | undefined;
    if (evaluation?.type === 'development') {
      const dev = ctx.developments.get(evaluation.id);
      const icon = developmentInfo[evaluation.id]?.icon || '';
      const resource = eff.effects?.find(
        (e) => e.type === 'resource' && e.method === 'add',
      );
      if (resource) {
        const key = resource.params?.['key'] as string;
        const resIcon = RESOURCES[key as ResourceKey]?.icon || key;
        const amount = Number(resource.params?.['amount']);
        return [
          `${modifierInfo.result.icon} Every time you gain resources from ${icon} ${dev?.name || evaluation.id}, gain ${resIcon}+${amount} more`,
        ];
      }
      const amount = Number(eff.params?.['amount'] ?? 0);
      return [
        `${modifierInfo.result.icon} Every time you gain resources from ${icon} ${dev?.name || evaluation.id}, gain +${amount} more of that resource`,
      ];
    }
    const actionId = eff.params?.['actionId'] as string;
    const actionIcon = actionInfo[actionId]?.icon || actionId;
    return sub.map((s) => `${modifierInfo.result.icon} ${actionIcon}: ${s}`);
  },
  describe: (eff, ctx) => {
    const sub = describeEffects(eff.effects || [], ctx);
    const evaluation = eff.params?.['evaluation'] as
      | { type: string; id: string }
      | undefined;
    if (evaluation?.type === 'development') {
      const dev = ctx.developments.get(evaluation.id);
      const icon = developmentInfo[evaluation.id]?.icon || '';
      const resource = eff.effects?.find(
        (e) => e.type === 'resource' && e.method === 'add',
      );
      if (resource) {
        const key = resource.params?.['key'] as string;
        const resIcon = RESOURCES[key as ResourceKey]?.icon || key;
        const amount = Number(resource.params?.['amount']);
        return [
          `${modifierInfo.result.icon} Every time you gain resources from ${icon} ${dev?.name || evaluation.id}, gain ${resIcon}+${amount} more of that resource`,
        ];
      }
      const amount = Number(eff.params?.['amount'] ?? 0);
      return [
        `${modifierInfo.result.icon} Every time you gain resources from ${icon} ${dev?.name || evaluation.id}, gain +${amount} more of that resource`,
      ];
    }
    const actionId = eff.params?.['actionId'] as string;
    const actionIcon = actionInfo[actionId]?.icon || actionId;
    let actionName = actionId;
    try {
      actionName = ctx.actions.get(actionId).name;
    } catch {
      /* ignore missing action */
    }
    return sub.map(
      (s) =>
        `${modifierInfo.result.icon} ${modifierInfo.result.label} on ${actionIcon} ${actionName}: ${s}`,
    );
  },
});
