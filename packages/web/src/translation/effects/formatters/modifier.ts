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
    const actionId = eff.params?.['actionId'] as string | undefined;
    const actionIcon = actionId ? actionInfo[actionId]?.icon || actionId : '';
    const prefix = actionId ? `${actionIcon}: ` : ': ';
    return `${modifierInfo.cost.icon}${prefix}${icon}${signed(amount)}${Math.abs(amount)}`;
  },
  describe: (eff, ctx) => {
    const key = eff.params?.['key'] as string;
    const icon = RESOURCES[key as ResourceKey]?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const actionId = eff.params?.['actionId'] as string | undefined;
    const actionIcon = actionId ? actionInfo[actionId]?.icon || actionId : '';
    const actionName = actionId
      ? ctx.actions.get(actionId)?.name || actionId
      : 'all actions';
    const target = actionId ? `${actionIcon} ${actionName}` : actionName;
    return `${modifierInfo.cost.icon} ${modifierInfo.cost.label} on ${target}: ${increaseOrDecrease(amount)} cost by ${icon}${Math.abs(amount)}`;
  },
});

registerEffectFormatter('cost_mod', 'remove', {
  summarize: (eff, _ctx) => {
    const key = eff.params?.['key'] as string;
    const icon = RESOURCES[key as ResourceKey]?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const actionId = eff.params?.['actionId'] as string | undefined;
    const actionIcon = actionId ? actionInfo[actionId]?.icon || actionId : '';
    const prefix = actionId ? `${actionIcon}: ` : ': ';
    const delta = -amount;
    const sign = delta >= 0 ? '+' : '-';
    return `${modifierInfo.cost.icon}${prefix}${icon}${sign}${Math.abs(delta)}`;
  },
  describe: (eff, ctx) => {
    const key = eff.params?.['key'] as string;
    const icon = RESOURCES[key as ResourceKey]?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const actionId = eff.params?.['actionId'] as string | undefined;
    const actionIcon = actionId ? actionInfo[actionId]?.icon || actionId : '';
    const actionName = actionId
      ? ctx.actions.get(actionId)?.name || actionId
      : 'all actions';
    const target = actionId ? `${actionIcon} ${actionName}` : actionName;
    return `${modifierInfo.cost.icon} ${modifierInfo.cost.label} on ${target}: ${increaseOrDecrease(-amount)} cost by ${icon}${Math.abs(amount)}`;
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
    if (evaluation?.type === 'population') {
      const action = ctx.actions.get(evaluation.id);
      const icon = actionInfo[evaluation.id]?.icon || '';
      const amount = Number(eff.params?.['amount'] ?? 0);
      return [
        `${modifierInfo.result.icon} Every time you gain resources from ${icon} ${action?.name || evaluation.id}, gain +${amount} more of that resource`,
      ];
    }
    const actionId = eff.params?.['actionId'] as string;
    const actionIcon = actionInfo[actionId]?.icon || actionId;
    return sub.map((s) =>
      typeof s === 'string'
        ? `${modifierInfo.result.icon} ${actionIcon}: ${s}`
        : {
            ...s,
            title: `${modifierInfo.result.icon} ${actionIcon}: ${s.title}`,
          },
    );
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
    if (evaluation?.type === 'population') {
      const action = ctx.actions.get(evaluation.id);
      const icon = actionInfo[evaluation.id]?.icon || '';
      const amount = Number(eff.params?.['amount'] ?? 0);
      return [
        `${modifierInfo.result.icon} Every time you gain resources from ${icon} ${action?.name || evaluation.id}, gain +${amount} more of that resource`,
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
    return sub.map((s) =>
      typeof s === 'string'
        ? `${modifierInfo.result.icon} ${modifierInfo.result.label} on ${actionIcon} ${actionName}: ${s}`
        : {
            ...s,
            title: `${modifierInfo.result.icon} ${modifierInfo.result.label} on ${actionIcon} ${actionName}: ${s.title}`,
          },
    );
  },
});
