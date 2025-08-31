import type { EngineContext } from '@kingdom-builder/engine';
import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import { PhasedTranslator } from './phased';
import type { PhasedDef } from './phased';
import { withInstallation } from './decorators';
import {
  BUILDING_INFO as buildingInfo,
  ACTION_INFO as actionInfo,
} from '@kingdom-builder/contents';

class BuildingCore implements ContentTranslator<string> {
  private phased = new PhasedTranslator();
  summarize(id: string, ctx: EngineContext): Summary {
    const def = ctx.buildings.get(id);
    return this.phased.summarize(def as unknown as PhasedDef, ctx);
  }
  describe(id: string, ctx: EngineContext): Summary {
    const def = ctx.buildings.get(id);
    return this.phased.describe(def as unknown as PhasedDef, ctx);
  }
  log(id: string, ctx: EngineContext): string[] {
    const def = ctx.buildings.get(id);
    const icon = buildingInfo[id]?.icon || actionInfo['build']?.icon || '';
    return [`${icon}${def.name}`];
  }
}

registerContentTranslator('building', withInstallation(new BuildingCore()));
