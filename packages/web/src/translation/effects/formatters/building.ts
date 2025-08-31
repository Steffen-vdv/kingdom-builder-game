import { registerEffectFormatter } from '../factory';

registerEffectFormatter('building', 'add', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    let name = id;
    let icon = '';
    try {
      const def = ctx.buildings.get(id);
      name = def.name;
      icon = def.icon || '';
    } catch {
      // ignore
    }
    if (!icon) icon = ctx.actions.get('build').icon || '';
    return `${icon}${name}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    let name = id;
    let icon = '';
    try {
      const def = ctx.buildings.get(id);
      name = def.name;
      icon = def.icon || '';
    } catch {
      // ignore
    }
    if (!icon) icon = ctx.actions.get('build').icon || '';
    return `Construct ${icon}${name}`;
  },
});
