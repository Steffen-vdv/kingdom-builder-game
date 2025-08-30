import type { EngineContext } from '@kingdom-builder/engine';
import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import { PhasedTranslator } from './phased';
import { withInstallation } from './decorators';

class BuildingCore implements ContentTranslator<string> {
  private phased = new PhasedTranslator();
  summarize(id: string, ctx: EngineContext): Summary {
    const def = ctx.buildings.get(id);
    return this.phased.summarize(def, ctx);
  }
  describe(id: string, ctx: EngineContext): Summary {
    const def = ctx.buildings.get(id);
    return this.phased.describe(def, ctx);
  }
}

registerContentTranslator('building', withInstallation(new BuildingCore()));
