import type { EngineContext } from '@kingdom-builder/engine';
import { ACTION_INFO as actionInfo } from '@kingdom-builder/contents';
import { registerEffectFormatter } from '../factory';

function getActionLabel(id: string, ctx: EngineContext) {
  let name = id;
  try {
    name = ctx.actions.get(id).name;
  } catch {
    // ignore missing action
  }
  const icon = actionInfo[id]?.icon || '';
  return { icon, name };
}

registerEffectFormatter('action', 'add', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionLabel(id, ctx);
    return `Gain ${icon}${name}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionLabel(id, ctx);
    return `Gain action ${icon}${name}`;
  },
  log: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionLabel(id, ctx);
    return `Unlocked ${icon} ${name}`;
  },
});

registerEffectFormatter('action', 'remove', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionLabel(id, ctx);
    return `Lose ${icon}${name}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionLabel(id, ctx);
    return `Lose action ${icon}${name}`;
  },
  log: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionLabel(id, ctx);
    return `Lost ${icon} ${name}`;
  },
});

registerEffectFormatter('action', 'perform', {
  summarize: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionLabel(id, ctx);
    return `${icon} ${name}`;
  },
  describe: (eff, ctx) => {
    const id = eff.params?.['id'] as string;
    if (!id) return null;
    const { icon, name } = getActionLabel(id, ctx);
    return `Perform action ${icon}${name}`;
  },
});
