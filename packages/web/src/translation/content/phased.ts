import type { EngineContext, EffectDef } from '@kingdom-builder/engine';
import { TRIGGER_INFO as triggerInfo } from '@kingdom-builder/contents';
import { summarizeEffects, describeEffects } from '../effects';
import type { Summary, SummaryEntry } from './types';

export interface PhasedDef {
  onBuild?: EffectDef<Record<string, unknown>>[] | undefined;
  onAttackResolved?: EffectDef<Record<string, unknown>>[] | undefined;
  [key: string]: EffectDef<Record<string, unknown>>[] | undefined;
}

export class PhasedTranslator {
  summarize(def: PhasedDef, ctx: EngineContext): Summary {
    const root: SummaryEntry[] = [];
    const build = summarizeEffects(def.onBuild, ctx);
    if (build.length) root.push(...build);
    for (const phase of ctx.phases) {
      const key =
        `on${phase.id.charAt(0).toUpperCase() + phase.id.slice(1)}Phase` as keyof PhasedDef;
      const eff = summarizeEffects(def[key], ctx);
      if (eff.length) {
        root.push({
          title: `${phase.icon} On each ${phase.label} Phase`,
          items: eff,
        });
      }
    }
    const atk = summarizeEffects(def.onAttackResolved, ctx);
    if (atk.length)
      root.push({
        title: `${triggerInfo.onAttackResolved.icon} ${triggerInfo.onAttackResolved.future}`,
        items: atk,
      });
    return root;
  }

  describe(def: PhasedDef, ctx: EngineContext): Summary {
    const root: SummaryEntry[] = [];
    const build = describeEffects(def.onBuild, ctx);
    if (build.length) root.push(...build);
    for (const phase of ctx.phases) {
      const key =
        `on${phase.id.charAt(0).toUpperCase() + phase.id.slice(1)}Phase` as keyof PhasedDef;
      const eff = describeEffects(def[key], ctx);
      if (eff.length) {
        root.push({
          title: `${phase.icon} On each ${phase.label} Phase`,
          items: eff,
        });
      }
    }
    const atk = describeEffects(def.onAttackResolved, ctx);
    if (atk.length)
      root.push({
        title: `${triggerInfo.onAttackResolved.icon} ${triggerInfo.onAttackResolved.future}`,
        items: atk,
      });
    return root;
  }
}
