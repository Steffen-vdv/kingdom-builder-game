import type { EffectDef, EngineContext } from '@kingdom-builder/engine';
import { developmentInfo } from '../../icons';

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

export function registerEffectFormatter(
  type: string,
  method: string,
  formatter: EffectFormatter,
): void {
  EFFECT_FORMATTERS.set(`${type}:${method}`, formatter);
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
      if (ev.type === 'development') {
        const devParams = ev.params as Record<string, string>;
        const devId = devParams['id']!;
        const icon = developmentInfo[devId]?.icon || devId;
        const sub = summarizeEffects(eff.effects, ctx);
        sub.forEach((s) => parts.push(`${s} per ${icon}`));
      } else {
        parts.push(...summarizeEffects(eff.effects, ctx));
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
      if (ev.type === 'development') {
        const devParams = ev.params as Record<string, string>;
        const devId = devParams['id']!;
        const info = developmentInfo[devId];
        const sub = describeEffects(eff.effects, ctx);
        sub.forEach((s) =>
          parts.push(
            `${s} for each ${info?.icon || ''}${info?.label || devId}`,
          ),
        );
      } else {
        parts.push(...describeEffects(eff.effects, ctx));
      }
      continue;
    }
    parts.push(...applyFormatter(eff, ctx, 'describe'));
  }
  return parts.map((p) => p.trim());
}
