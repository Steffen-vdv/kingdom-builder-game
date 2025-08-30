import {
  BUILDING_INFO as buildingInfo,
  ACTION_INFO as actionInfo,
} from '@kingdom-builder/contents';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('building', 'add', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    let name = id;
    try {
      name = ctx.buildings.get(id).name;
    } catch {
      // ignore
    }
    const icon = buildingInfo[id]?.icon || actionInfo['build']?.icon || '';
    return `${icon}${name}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    let name = id;
    try {
      name = ctx.buildings.get(id).name;
    } catch {
      // ignore
    }
    const icon = buildingInfo[id]?.icon || actionInfo['build']?.icon || '';
    return `Construct ${icon}${name}`;
  },
});
