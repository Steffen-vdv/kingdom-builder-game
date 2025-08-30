import type { EngineContext } from '@kingdom-builder/engine';
import { phaseInfo, actionInfo } from '../../icons';
import { summarizeEffects, describeEffects } from '../effects';
import { registerContentTranslator, logContent } from './factory';
import type { ContentTranslator, Summary } from './types';

class ActionTranslator
  implements ContentTranslator<string, Record<string, unknown>>
{
  summarize(id: string, ctx: EngineContext): Summary {
    const def = ctx.actions.get(id);
    const eff = summarizeEffects(def.effects, ctx);
    if (!eff.length) return [];
    return [
      {
        title: `${phaseInfo.mainPhase.icon} ${phaseInfo.mainPhase.future}`,
        items: eff,
      },
    ];
  }
  describe(id: string, ctx: EngineContext): Summary {
    const def = ctx.actions.get(id);
    const eff = describeEffects(def.effects, ctx);
    if (!eff.length) return [];
    return [
      {
        title: `${phaseInfo.mainPhase.icon} ${phaseInfo.mainPhase.future}`,
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
    const icon = actionInfo[id as keyof typeof actionInfo]?.icon || '';
    let message = `Played ${icon} ${def.name}`;
    const extra = this.logHandlers[id]?.(ctx, params);
    if (extra) message += extra;
    return [message];
  }
}

registerContentTranslator('action', new ActionTranslator());
