import type { EngineContext } from '@kingdom-builder/engine';
import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import { PhasedTranslator } from './phased';
import { withInstallation } from './decorators';
import { developmentInfo } from '../../icons';

class DevelopmentCore implements ContentTranslator<string> {
  private phased = new PhasedTranslator();
  summarize(id: string, ctx: EngineContext): Summary {
    const def = ctx.developments.get(id);
    return this.phased.summarize(def, ctx);
  }
  describe(id: string, ctx: EngineContext): Summary {
    const def = ctx.developments.get(id);
    return this.phased.describe(def, ctx);
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
