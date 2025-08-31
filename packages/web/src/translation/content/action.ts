import type { EngineContext } from '@kingdom-builder/engine';
import {
  TRIGGER_INFO as triggerInfo,
  ACTION_INFO as actionInfo,
} from '@kingdom-builder/contents';
import { summarizeEffects, describeEffects } from '../effects';
import { applyParamsToEffects } from '@kingdom-builder/engine';
import { registerContentTranslator, logContent } from './factory';
import type { ContentTranslator, Summary } from './types';

class ActionTranslator
  implements ContentTranslator<string, Record<string, unknown>>
{
  summarize(
    id: string,
    ctx: EngineContext,
    opts?: Record<string, unknown>,
  ): Summary {
    const def = ctx.actions.get(id);
    const effects = opts
      ? applyParamsToEffects(def.effects, opts)
      : def.effects;
    const eff = summarizeEffects(effects, ctx);
    if (!eff.length) return [];
    return [
      {
        title: `${triggerInfo.mainPhase.icon} ${triggerInfo.mainPhase.future}`,
        items: eff,
      },
    ];
  }
  describe(
    id: string,
    ctx: EngineContext,
    opts?: Record<string, unknown>,
  ): Summary {
    const def = ctx.actions.get(id);
    const effects = opts
      ? applyParamsToEffects(def.effects, opts)
      : def.effects;
    const eff = describeEffects(effects, ctx);
    if (!eff.length) return [];
    return [
      {
        title: `${triggerInfo.mainPhase.icon} ${triggerInfo.mainPhase.future}`,
        items: eff,
      },
    ];
  }
  private logHandlers: Record<
    string,
    (ctx: EngineContext, params?: Record<string, unknown>) => string
  > = {
    develop: (ctx, params) => {
      const id =
        typeof (params as { id?: string })?.id === 'string'
          ? (params as { id: string }).id
          : undefined;
      if (!id) return '';
      const target = logContent('development', id, ctx)[0];
      return target ? ` - ${target}` : '';
    },
    build: (ctx, params) => {
      const id =
        typeof (params as { id?: string })?.id === 'string'
          ? (params as { id: string }).id
          : undefined;
      if (!id) return '';
      const target = logContent('building', id, ctx)[0];
      return target ? ` - ${target}` : '';
    },
  };
  log(
    id: string,
    ctx: EngineContext,
    params?: Record<string, unknown>,
  ): string[] {
    const def = ctx.actions.get(id);
    const info = actionInfo[id];
    const icon = info?.icon || '';
    const label = info?.label || def.name;
    let message = `Played ${icon} ${label}`;
    const extra = this.logHandlers[id]?.(ctx, params);
    if (extra) message += extra;
    return [message];
  }
}

registerContentTranslator('action', new ActionTranslator());
