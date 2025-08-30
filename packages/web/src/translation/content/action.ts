import type { EngineContext } from '@kingdom-builder/engine';
import { phaseInfo } from '../../icons';
import { summarizeEffects, describeEffects } from '../effects';
import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';

class ActionTranslator implements ContentTranslator<string> {
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
}

registerContentTranslator('action', new ActionTranslator());
