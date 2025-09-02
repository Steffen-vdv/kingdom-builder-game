import {
  MODIFIER_INFO as modifierInfo,
  RESOURCES,
  POPULATION_INFO,
} from '@kingdom-builder/contents';
import type {
  ActionDef,
  DevelopmentDef,
  ResourceKey,
} from '@kingdom-builder/contents';
import { increaseOrDecrease, signed } from '../helpers';
import { describeContent } from '../../content';
import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
} from '../factory';
import type { EngineContext, EffectDef } from '@kingdom-builder/engine';
import type { Summary } from '../../content/types';

interface ModifierEvalHandler {
  summarize: (
    eff: EffectDef,
    evaluation: { type: string; id: string },
    ctx: EngineContext,
  ) => Summary;
  describe: (
    eff: EffectDef,
    evaluation: { type: string; id: string },
    ctx: EngineContext,
  ) => Summary;
}

export const MODIFIER_EVAL_HANDLERS: Record<string, ModifierEvalHandler> = {};

export function registerModifierEvalHandler(
  type: string,
  handler: ModifierEvalHandler,
) {
  MODIFIER_EVAL_HANDLERS[type] = handler;
}

function getActionInfo(ctx: EngineContext, id: string) {
  try {
    const action: ActionDef = ctx.actions.get(id);
    return { icon: action.icon ?? id, name: action.name ?? id };
  } catch {
    return { icon: id, name: id };
  }
}

function getDevelopmentInfo(ctx: EngineContext, id: string) {
  try {
    const dev: DevelopmentDef = ctx.developments.get(id);
    return { icon: dev.icon ?? '', name: dev.name ?? id };
  } catch {
    return { icon: '', name: id };
  }
}

function formatGainFrom(
  source: string,
  amount: number,
  options: { key?: string; detailed?: boolean } = {},
) {
  const { key, detailed } = options;
  const resIcon = key ? RESOURCES[key as ResourceKey]?.icon || key : undefined;
  const more = resIcon
    ? `${resIcon}+${amount} more${detailed ? ' of that resource' : ''}`
    : `+${amount} more of that resource`;
  return `${modifierInfo.result.icon} Every time you gain resources from ${source}, gain ${more}`;
}

function formatDevelopment(
  eff: EffectDef,
  evaluation: { id: string },
  ctx: EngineContext,
  detailed: boolean,
) {
  const { icon, name } = getDevelopmentInfo(ctx, evaluation.id);
  const resource = eff.effects?.find(
    (e): e is EffectDef<{ key: string; amount: number }> =>
      e.type === 'resource' && e.method === 'add',
  );
  if (resource) {
    const key = resource.params?.['key'] as string;
    const amount = Number(resource.params?.['amount']);
    return formatGainFrom(`${icon} ${name}`, amount, { key, detailed });
  }
  const amount = Number(eff.params?.['amount'] ?? 0);
  return formatGainFrom(`${icon} ${name}`, amount);
}

function formatPopulation(
  eff: EffectDef,
  evaluation: { id: string },
  ctx: EngineContext,
) {
  const { icon, name } = getActionInfo(ctx, evaluation.id);
  const amount = Number(eff.params?.['amount'] ?? 0);
  return formatGainFrom(
    `${POPULATION_INFO.icon} ${POPULATION_INFO.label} through ${icon} ${name}`,
    amount,
  );
}

registerModifierEvalHandler('development', {
  summarize: (eff, evaluation, ctx) => [
    formatDevelopment(eff, evaluation, ctx, false),
  ],
  describe: (eff, evaluation, ctx) => [
    formatDevelopment(eff, evaluation, ctx, true),
  ],
});

registerModifierEvalHandler('population', {
  summarize: (eff, evaluation, ctx) => [formatPopulation(eff, evaluation, ctx)],
  describe: (eff, evaluation, ctx) => [formatPopulation(eff, evaluation, ctx)],
});

registerModifierEvalHandler('transfer_pct', {
  summarize: (eff, _evaluation, ctx) => {
    const { icon, name } = getActionInfo(ctx, 'plunder');
    const amount = Number(eff.params?.['adjust'] ?? 0);
    return [
      `${modifierInfo.result.icon} ${icon} ${name}: ${signed(amount)}${Math.abs(
        amount,
      )}% transfer`,
    ];
  },
  describe: (eff, _evaluation, ctx) => {
    const { icon, name } = getActionInfo(ctx, 'plunder');
    const amount = Number(eff.params?.['adjust'] ?? 0);
    const card = describeContent('action', 'plunder', ctx);
    return [
      `${modifierInfo.result.icon} ${modifierInfo.result.label} on ${icon} ${name}: ${increaseOrDecrease(
        amount,
      )} transfer by ${Math.abs(amount)}%`,
      {
        title: `${icon} ${name}`,
        items: card,
        _hoist: true,
        _desc: true,
      },
    ];
  },
});

registerEffectFormatter('cost_mod', 'add', {
  summarize: (eff, ctx) => {
    const key = eff.params?.['key'] as string;
    const icon = RESOURCES[key as ResourceKey]?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const actionId = eff.params?.['actionId'] as string | undefined;
    const actionIcon = actionId ? getActionInfo(ctx, actionId).icon : '';
    const prefix = actionId ? `${actionIcon}: ` : ': ';
    return `${modifierInfo.cost.icon}${prefix}${icon}${signed(amount)}${Math.abs(amount)}`;
  },
  describe: (eff, ctx) => {
    const key = eff.params?.['key'] as string;
    const icon = RESOURCES[key as ResourceKey]?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const actionId = eff.params?.['actionId'] as string | undefined;
    const { icon: actionIcon, name: actionName } = actionId
      ? getActionInfo(ctx, actionId)
      : { icon: '', name: 'all actions' };
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
    const actionIcon = actionId ? getActionInfo(ctx, actionId).icon : '';
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
    const { icon: actionIcon, name: actionName } = actionId
      ? getActionInfo(ctx, actionId)
      : { icon: '', name: 'all actions' };
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
      const handler = MODIFIER_EVAL_HANDLERS[evaluation.type];
      return handler ? handler.summarize(eff, evaluation, ctx) : [];
    }
    const actionId = eff.params?.['actionId'] as string;
    const { icon: actionIcon } = getActionInfo(ctx, actionId);
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
      const handler = MODIFIER_EVAL_HANDLERS[evaluation.type];
      return handler ? handler.describe(eff, evaluation, ctx) : [];
    }
    const actionId = eff.params?.['actionId'] as string;
    const { icon: actionIcon, name: actionName } = getActionInfo(ctx, actionId);
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
