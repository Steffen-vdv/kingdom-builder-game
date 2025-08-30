import type { EffectDef, EngineContext } from '@kingdom-builder/engine';
import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import { PhasedTranslator } from './phased';
import type { PhasedDef } from './phased';
import { withInstallation } from './decorators';
import { DEVELOPMENT_INFO as developmentInfo } from '@kingdom-builder/contents';

interface PhaseEffects {
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

function collectPhaseEffects(id: string, ctx: EngineContext): PhaseEffects {
  const result: PhaseEffects = {};
  for (const phase of ctx.phases) {
    const key =
      `on${phase.id.charAt(0).toUpperCase() + phase.id.slice(1)}Phase` as keyof PhaseEffects;
    for (const step of phase.steps) {
      const bucket: EffectDef[] = [];
      gatherEffects(step.effects, id, bucket);
      if (bucket.length) {
        result[key] = [...(result[key] ?? []), ...bucket];
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
    const phases = collectPhaseEffects(id, ctx);
    const merged: PhasedDef = { ...(def as unknown as PhasedDef) };
    for (const [key, effects] of Object.entries(phases)) {
      if (!effects) continue;
      merged[key] = [...((merged[key] as EffectDef[]) || []), ...effects];
    }
    return this.phased.summarize(merged, ctx);
  }
  describe(id: string, ctx: EngineContext): Summary {
    const def = ctx.developments.get(id);
    if (!def) return [];
    const phases = collectPhaseEffects(id, ctx);
    const merged: PhasedDef = { ...(def as unknown as PhasedDef) };
    for (const [key, effects] of Object.entries(phases)) {
      if (!effects) continue;
      merged[key] = [...((merged[key] as EffectDef[]) || []), ...effects];
    }
    return this.phased.describe(merged, ctx);
  }
  log(id: string, ctx: EngineContext): string[] {
    const def = ctx.developments.get(id);
    const icon = developmentInfo[id]?.icon || '';
    return [`${icon}${def.name}`];
  }
}

registerContentTranslator(
  'development',
  withInstallation(new DevelopmentCore()),
);
