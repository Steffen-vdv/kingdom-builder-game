import type { EffectDef, EngineContext } from '@kingdom-builder/engine';
// Effect and evaluator formatter registries drive translation lookups.

export interface EffectFormatter {
  summarize?: (
    effect: EffectDef<Record<string, unknown>>,
    ctx: EngineContext,
  ) => string | string[] | null;
  describe?: (
    effect: EffectDef<Record<string, unknown>>,
    ctx: EngineContext,
  ) => string | string[] | null;
}

const EFFECT_FORMATTERS = new Map<string, EffectFormatter>();
const EVALUATOR_FORMATTERS = new Map<string, EvaluatorFormatter>();

export function registerEffectFormatter(
  type: string,
  method: string,
  formatter: EffectFormatter,
): void {
  EFFECT_FORMATTERS.set(`${type}:${method}`, formatter);
}

export interface EvaluatorFormatter {
  summarize?: (
    ev: { type: string; params: Record<string, unknown> },
    sub: string[],
    ctx: EngineContext,
  ) => string[];
  describe?: (
    ev: { type: string; params: Record<string, unknown> },
    sub: string[],
    ctx: EngineContext,
  ) => string[];
}

export function registerEvaluatorFormatter(
  type: string,
  formatter: EvaluatorFormatter,
): void {
  EVALUATOR_FORMATTERS.set(type, formatter);
}

function applyFormatter(
  effect: EffectDef<Record<string, unknown>>,
  ctx: EngineContext,
  mode: 'summarize' | 'describe',
): string[] {
  const key = `${effect.type}:${effect.method ?? ''}`;
  const handler = EFFECT_FORMATTERS.get(key);
  if (!handler) return [];
  const fn = handler[mode];
  if (!fn) return [];
  const result = fn(effect, ctx);
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

export function summarizeEffects(
  effects: readonly EffectDef<Record<string, unknown>>[] | undefined,
  ctx: EngineContext,
): string[] {
  const parts: string[] = [];
  for (const eff of effects || []) {
    if (eff.evaluator) {
      const ev = eff.evaluator as {
        type: string;
        params: Record<string, unknown>;
      };
      const sub = summarizeEffects(eff.effects, ctx);
      const handler = EVALUATOR_FORMATTERS.get(ev.type);
      if (handler?.summarize) {
        parts.push(...handler.summarize(ev, sub, ctx));
      } else {
        parts.push(...sub);
      }
      continue;
    }
    parts.push(...applyFormatter(eff, ctx, 'summarize'));
  }
  return parts.map((p) => p.trim());
}

export function describeEffects(
  effects: readonly EffectDef<Record<string, unknown>>[] | undefined,
  ctx: EngineContext,
): string[] {
  const parts: string[] = [];
  for (const eff of effects || []) {
    if (eff.evaluator) {
      const ev = eff.evaluator as {
        type: string;
        params: Record<string, unknown>;
      };
      const sub = describeEffects(eff.effects, ctx);
      const handler = EVALUATOR_FORMATTERS.get(ev.type);
      if (handler?.describe) {
        parts.push(...handler.describe(ev, sub, ctx));
      } else {
        parts.push(...sub);
      }
      continue;
    }
    parts.push(...applyFormatter(eff, ctx, 'describe'));
  }
  return parts.map((p) => p.trim());
}
