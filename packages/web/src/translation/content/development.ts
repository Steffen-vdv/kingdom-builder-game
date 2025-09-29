import type { EffectDef, EngineContext } from '@kingdom-builder/engine';
import { applyParamsToEffects } from '@kingdom-builder/engine';
import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import { PhasedTranslator } from './phased';
import type { PhasedDef } from './phased';
import { withInstallation } from './decorators';

interface PhaseEffects {
  onBeforeAttacked?: EffectDef[];
  onAttackResolved?: EffectDef[];
  [key: string]: EffectDef[] | undefined;
}

function gatherEffects(
  effects: EffectDef[] | undefined,
  id: string,
  out: EffectDef[],
): void {
  if (!effects) return;
  for (const eff of effects) {
    if (
      eff.evaluator?.type === 'development' &&
      (eff.evaluator.params as Record<string, string> | undefined)?.['id'] ===
        id
    ) {
      out.push(eff);
    }
    if (eff.effects) gatherEffects(eff.effects, id, out);
  }
}

function applySelfParams(
  def: PhasedDef,
  params: Record<string, unknown>,
): PhasedDef {
  const mapped: PhasedDef = {};
  const entries = def as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(entries)) {
    if (!Array.isArray(value)) continue;
    mapped[key as keyof PhasedDef] = applyParamsToEffects(
      value as EffectDef<Record<string, unknown>>[],
      params,
    );
  }
  return mapped;
}

function collectPhaseEffects(
  id: string,
  ctx: EngineContext,
  params: Record<string, unknown>,
): PhaseEffects {
  const result: PhaseEffects = {};
  for (const phase of ctx.phases) {
    const key =
      `on${phase.id.charAt(0).toUpperCase() + phase.id.slice(1)}Phase` as keyof PhaseEffects;
    for (const step of phase.steps) {
      const bucket: EffectDef[] = [];
      gatherEffects(step.effects, id, bucket);
      if (bucket.length) {
        const applied = applyParamsToEffects(bucket, params);
        result[key] = [...(result[key] ?? []), ...applied];
      }
    }
  }
  return result;
}

class DevelopmentCore implements ContentTranslator<string> {
  private phased = new PhasedTranslator();
  summarize(id: string, ctx: EngineContext): Summary {
    const def = ctx.developments.get(id);
    if (!def) return [];
    const params = { id };
    const base = applySelfParams(def as unknown as PhasedDef, params);
    const merged: PhasedDef = { ...base };
    const phases = collectPhaseEffects(id, ctx, params);
    for (const [key, effects] of Object.entries(phases)) {
      if (!effects?.length) continue;
      const current = merged[key as keyof PhasedDef] ?? [];
      merged[key as keyof PhasedDef] = [
        ...current,
        ...applyParamsToEffects(effects, params),
      ];
    }
    return this.phased.summarize(merged, ctx);
  }
  describe(id: string, ctx: EngineContext): Summary {
    const def = ctx.developments.get(id);
    if (!def) return [];
    const params = { id };
    const base = applySelfParams(def as unknown as PhasedDef, params);
    const merged: PhasedDef = { ...base };
    const phases = collectPhaseEffects(id, ctx, params);
    for (const [key, effects] of Object.entries(phases)) {
      if (!effects?.length) continue;
      const current = merged[key as keyof PhasedDef] ?? [];
      merged[key as keyof PhasedDef] = [
        ...current,
        ...applyParamsToEffects(effects, params),
      ];
    }
    return this.phased.describe(merged, ctx);
  }
  log(id: string, ctx: EngineContext): string[] {
    const def = ctx.developments.get(id);
    const icon = def.icon || '';
    return [`${icon}${def.name}`];
  }
}

registerContentTranslator(
  'development',
  withInstallation(new DevelopmentCore()),
);
