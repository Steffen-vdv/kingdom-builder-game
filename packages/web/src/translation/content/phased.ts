import type { EngineContext, EffectDef } from '@kingdom-builder/engine';
import { phaseInfo } from '../../icons';
import { summarizeEffects, describeEffects } from '../effects';
import type { Summary, SummaryEntry } from './types';

interface PhasedDef {
  onBuild?: EffectDef<Record<string, unknown>>[] | undefined;
  onDevelopmentPhase?: EffectDef<Record<string, unknown>>[] | undefined;
  onUpkeepPhase?: EffectDef<Record<string, unknown>>[] | undefined;
  onAttackResolved?: EffectDef<Record<string, unknown>>[] | undefined;
}

export class PhasedTranslator {
  summarize(def: PhasedDef, ctx: EngineContext): Summary {
    const root: SummaryEntry[] = [];
    const build = summarizeEffects(def.onBuild, ctx);
    if (build.length) root.push(...build);
    const dev = summarizeEffects(def.onDevelopmentPhase, ctx);
    if (dev.length)
      root.push({
        title: `${phaseInfo.onDevelopmentPhase.icon} ${phaseInfo.onDevelopmentPhase.label}`,
        items: dev,
      });
    const upk = summarizeEffects(def.onUpkeepPhase, ctx);
    if (upk.length)
      root.push({
        title: `${phaseInfo.onUpkeepPhase.icon} ${phaseInfo.onUpkeepPhase.label}`,
        items: upk,
      });
    const atk = summarizeEffects(def.onAttackResolved, ctx);
    if (atk.length)
      root.push({
        title: `${phaseInfo.onAttackResolved.icon} ${phaseInfo.onAttackResolved.label}`,
        items: atk,
      });
    return root;
  }

  describe(def: PhasedDef, ctx: EngineContext): Summary {
    const root: SummaryEntry[] = [];
    const build = describeEffects(def.onBuild, ctx);
    if (build.length) root.push(...build);
    const dev = describeEffects(def.onDevelopmentPhase, ctx);
    if (dev.length)
      root.push({
        title: `${phaseInfo.onDevelopmentPhase.icon} ${phaseInfo.onDevelopmentPhase.label}`,
        items: dev,
      });
    const upk = describeEffects(def.onUpkeepPhase, ctx);
    if (upk.length)
      root.push({
        title: `${phaseInfo.onUpkeepPhase.icon} ${phaseInfo.onUpkeepPhase.label}`,
        items: upk,
      });
    const atk = describeEffects(def.onAttackResolved, ctx);
    if (atk.length)
      root.push({
        title: `${phaseInfo.onAttackResolved.icon} ${phaseInfo.onAttackResolved.label}`,
        items: atk,
      });
    return root;
  }
}
