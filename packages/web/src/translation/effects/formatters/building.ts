import { registerEffectFormatter } from '../factory';
import { getActionInfo, getBuildingInfo } from '../helpers';

registerEffectFormatter('building', 'add', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    const { icon, name } = getBuildingInfo(ctx, id);
    const buildIcon = icon || getActionInfo(ctx, 'build').icon;
    return `${buildIcon}${name}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    const { icon, name } = getBuildingInfo(ctx, id);
    const buildIcon = icon || getActionInfo(ctx, 'build').icon;
    return `Construct ${buildIcon}${name}`;
  },
});
