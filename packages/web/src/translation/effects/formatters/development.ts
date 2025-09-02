import { registerEffectFormatter } from '../factory';
import { getDevelopmentInfo } from '../helpers';

registerEffectFormatter('development', 'add', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    const { icon } = getDevelopmentInfo(ctx, id);
    return icon || id;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    const { icon, name } = getDevelopmentInfo(ctx, id);
    return `Add ${icon}${name}`;
  },
});

registerEffectFormatter('development', 'remove', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    const { icon } = getDevelopmentInfo(ctx, id);
    return `Remove ${icon || id}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    const { icon, name } = getDevelopmentInfo(ctx, id);
    return `Remove ${icon}${name}`;
  },
});
