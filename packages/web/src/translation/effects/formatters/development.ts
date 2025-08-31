import { registerEffectFormatter } from '../factory';

registerEffectFormatter('development', 'add', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    let icon = id;
    try {
      icon = ctx.developments.get(id).icon || id;
    } catch {
      /* ignore */
    }
    return `${icon}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    let def: { name: string; icon?: string | undefined } | undefined;
    try {
      def = ctx.developments.get(id);
    } catch {
      /* ignore */
    }
    const label = def?.name || id;
    const icon = def?.icon || '';
    return `Add ${icon}${label}`;
  },
});

registerEffectFormatter('development', 'remove', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    let icon = id;
    try {
      icon = ctx.developments.get(id).icon || id;
    } catch {
      /* ignore */
    }
    return `Remove ${icon}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    let def: { name: string; icon?: string | undefined } | undefined;
    try {
      def = ctx.developments.get(id);
    } catch {
      /* ignore */
    }
    const label = def?.name || id;
    const icon = def?.icon || '';
    return `Remove ${icon}${label}`;
  },
});
