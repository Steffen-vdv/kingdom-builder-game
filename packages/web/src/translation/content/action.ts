import type { EngineContext } from '@kingdom-builder/engine';
import { summarizeEffects, describeEffects, logEffects } from '../effects';
import { applyParamsToEffects } from '@kingdom-builder/engine';
import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import { getActionLogHook } from './actionLogHooks';

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
    return eff.length ? eff : [];
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
    return eff.length ? eff : [];
  }
  log(
    id: string,
    ctx: EngineContext,
    params?: Record<string, unknown>,
  ): string[] {
    const def = ctx.actions.get(id);
    const icon = def.icon || '';
    const label = def.name;
    let message = `Played ${icon} ${label}`;
    const extra = getActionLogHook(id)?.(ctx, params);
    if (extra) message += extra;
    const effects = params
      ? applyParamsToEffects(def.effects, params)
      : def.effects;
    const effLogs = logEffects(effects, ctx);
    const lines = [message];
    function push(entry: unknown, depth: number) {
      if (typeof entry === 'string')
        lines.push(`${'  '.repeat(depth)}${entry}`);
      else if (entry && typeof entry === 'object') {
        const e = entry as { title: string; items: unknown[] };
        lines.push(`${'  '.repeat(depth)}${e.title}`);
        e.items.forEach((i) => push(i, depth + 1));
      }
    }
    effLogs.forEach((e) => push(e, 1));
    return lines;
  }
}

registerContentTranslator('action', new ActionTranslator());
