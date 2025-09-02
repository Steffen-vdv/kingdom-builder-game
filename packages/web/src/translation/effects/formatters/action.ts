import { describeContent } from '../../content';
import { registerEffectFormatter, logEffects } from '../factory';
import { getActionInfo } from '../helpers';

registerEffectFormatter('action', 'add', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionInfo(ctx, id);
    return `Gain action ${icon} ${name}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionInfo(ctx, id);
    const card = describeContent('action', id, ctx);
    let isSystem = false;
    try {
      isSystem = !!ctx.actions.get(id).system;
    } catch {
      // ignore missing action
    }
    return [
      `Gain action ${icon} ${name}`,
      {
        title: `${icon} ${name}`,
        items: card,
        _hoist: true,
        ...(isSystem && { _desc: true }),
      },
    ];
  },
  log: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionInfo(ctx, id);
    return `Unlocked ${icon} ${name}`;
  },
});

registerEffectFormatter('action', 'remove', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionInfo(ctx, id);
    return `Lose ${icon} ${name}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionInfo(ctx, id);
    return `Lose action ${icon} ${name}`;
  },
  log: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionInfo(ctx, id);
    return `Lost ${icon} ${name}`;
  },
});

registerEffectFormatter('action', 'perform', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionInfo(ctx, id);
    return `${icon} ${name}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionInfo(ctx, id);
    const summary = describeContent('action', id, ctx);
    return [
      {
        title: `${icon} ${name}`,
        items: summary,
      },
    ];
  },
  log: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionInfo(ctx, id);
    const def = ctx.actions.get(id);
    const sub = logEffects(def.effects, ctx);
    return [{ title: `${icon} ${name}`, items: sub }];
  },
});
