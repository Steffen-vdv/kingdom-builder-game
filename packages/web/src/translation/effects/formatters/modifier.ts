import {
  MODIFIER_INFO as modifierInfo,
  RESOURCES,
} from '@kingdom-builder/contents';
import type { ResourceKey } from '@kingdom-builder/contents';
import { increaseOrDecrease, signed } from '../helpers';
import { describeContent } from '../../content';
import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
} from '../factory';

registerEffectFormatter('cost_mod', 'add', {
  summarize: (eff, ctx) => {
    const key = eff.params?.['key'] as string;
    const icon = RESOURCES[key as ResourceKey]?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const actionId = eff.params?.['actionId'] as string | undefined;
    const actionIcon = actionId
      ? ctx.actions.get(actionId)?.icon || actionId
      : '';
    const prefix = actionId ? `${actionIcon}: ` : ': ';
    return `${modifierInfo.cost.icon}${prefix}${icon}${signed(amount)}${Math.abs(amount)}`;
  },
  describe: (eff, ctx) => {
    const key = eff.params?.['key'] as string;
    const icon = RESOURCES[key as ResourceKey]?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const actionId = eff.params?.['actionId'] as string | undefined;
    const actionIcon = actionId
      ? ctx.actions.get(actionId)?.icon || actionId
      : '';
    const actionName = actionId
      ? ctx.actions.get(actionId)?.name || actionId
      : 'all actions';
    const target = actionId ? `${actionIcon} ${actionName}` : actionName;
    return `${modifierInfo.cost.icon} ${modifierInfo.cost.label} on ${target}: ${increaseOrDecrease(amount)} cost by ${icon}${Math.abs(amount)}`;
  },
});

registerEffectFormatter('cost_mod', 'remove', {
  summarize: (eff, ctx) => {
    const key = eff.params?.['key'] as string;
    const icon = RESOURCES[key as ResourceKey]?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const actionId = eff.params?.['actionId'] as string | undefined;
    const actionIcon = actionId
      ? ctx.actions.get(actionId)?.icon || actionId
      : '';
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
    const actionIcon = actionId
      ? ctx.actions.get(actionId)?.icon || actionId
      : '';
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
    if (evaluation) {
      if (evaluation.type === 'development') {
        const dev = ctx.developments.get(evaluation.id);
        const icon = ctx.developments.get(evaluation.id)?.icon || '';
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
      if (evaluation.type === 'population') {
        const action = ctx.actions.get(evaluation.id);
        const actionIcon = action?.icon || evaluation.id;
        const actionName = action?.name || evaluation.id;
        const amount = Number(eff.params?.['amount'] ?? 0);
        return [
          `${modifierInfo.result.icon} Every time you gain resources from 👥 Population through ${actionIcon} ${actionName}, gain +${amount} more of that resource`,
        ];
      }
      if (evaluation.type === 'transfer_pct') {
        const action = ctx.actions.get('plunder');
        const actionIcon = action?.icon || 'plunder';
        const actionName = action?.name || 'plunder';
        const amount = Number(eff.params?.['adjust'] ?? 0);
        return [
          `${modifierInfo.result.icon} ${actionIcon} ${actionName}: ${signed(amount)}${Math.abs(amount)}% transfer`,
        ];
      }
      return [];
    }
    const actionId = eff.params?.['actionId'] as string;
    const actionIcon = ctx.actions.get(actionId)?.icon || actionId;
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
    if (evaluation) {
      if (evaluation.type === 'development') {
        const dev = ctx.developments.get(evaluation.id);
        const icon = ctx.developments.get(evaluation.id)?.icon || '';
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
      if (evaluation.type === 'population') {
        const action = ctx.actions.get(evaluation.id);
        const actionIcon = action?.icon || evaluation.id;
        const actionName = action?.name || evaluation.id;
        const amount = Number(eff.params?.['amount'] ?? 0);
        return [
          `${modifierInfo.result.icon} Every time you gain resources from 👥 Population through ${actionIcon} ${actionName}, gain +${amount} more of that resource`,
        ];
      }
      if (evaluation.type === 'transfer_pct') {
        const action = ctx.actions.get('plunder');
        const actionIcon = action?.icon || 'plunder';
        const actionName = action?.name || 'plunder';
        const amount = Number(eff.params?.['adjust'] ?? 0);
        const card = describeContent('action', 'plunder', ctx);
        return [
          `${modifierInfo.result.icon} ${modifierInfo.result.label} on ${actionIcon} ${actionName}: ${increaseOrDecrease(amount)} transfer by ${Math.abs(amount)}%`,
          {
            title: `${actionIcon} ${actionName}`,
            items: card,
            _hoist: true,
            _desc: true,
          },
        ];
      }
      return [];
    }
    const actionId = eff.params?.['actionId'] as string;
    const actionIcon = ctx.actions.get(actionId)?.icon || actionId;
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
