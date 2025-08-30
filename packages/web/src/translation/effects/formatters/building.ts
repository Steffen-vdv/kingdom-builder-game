import { buildingIcon } from '../../../icons';
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
    return `${buildingIcon}${name}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    let name = id;
    try {
      name = ctx.buildings.get(id).name;
    } catch {
      // ignore
    }
    return `Construct ${buildingIcon}${name}`;
  },
});
