import type { EffectDef, EngineContext } from '@kingdom-builder/engine';

export interface StatAddFormatter {
  summarize?: (
    effect: EffectDef<Record<string, unknown>>,
    ctx: EngineContext,
  ) => string | null;
  describe?: (
    effect: EffectDef<Record<string, unknown>>,
    ctx: EngineContext,
  ) => string | null;
}

const STAT_ADD_FORMATTERS = new Map<string, StatAddFormatter>();

export function registerStatAddFormatter(
  key: string,
  formatter: StatAddFormatter,
): void {
  STAT_ADD_FORMATTERS.set(key, formatter);
}

export function applyStatAddFormatter(
  effect: EffectDef<Record<string, unknown>>,
  ctx: EngineContext,
  mode: 'summarize' | 'describe',
): string {
  const key = effect.params?.['key'] as string;
  const handler = STAT_ADD_FORMATTERS.get(key) || STAT_ADD_FORMATTERS.get('*');
  if (!handler) return '';
  const fn = handler[mode];
  return fn ? fn(effect, ctx) || '' : '';
}
