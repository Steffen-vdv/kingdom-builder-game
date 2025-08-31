import { RESOURCES } from '@kingdom-builder/contents';
import type { ResourceKey } from '@kingdom-builder/engine';
import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('resource', 'add', {
  summarize: (eff) => {
    const key = eff.params?.['key'] as string;
    const res = RESOURCES[key as ResourceKey];
    const icon = res ? res.icon : key;
    const amount = Number(eff.params?.['amount']);
    return `${icon}${signed(amount)}${amount}`;
  },
  describe: (eff) => {
    const key = eff.params?.['key'] as string;
    const res = RESOURCES[key as ResourceKey];
    const label = res?.label || key;
    const icon = res?.icon || key;
    const amount = Number(eff.params?.['amount']);
    return `${icon}${signed(amount)}${amount} ${label}`;
  },
});

registerEffectFormatter('resource', 'transfer', {
  summarize: (eff) => {
    const key = eff.params?.['key'] as string;
    const res = RESOURCES[key as ResourceKey];
    const icon = res?.icon || key;
    const percent = Number(eff.params?.['percent']);
    return `Transfer ${percent}% ${icon}`;
  },
  describe: (eff) => {
    const key = eff.params?.['key'] as string;
    const res = RESOURCES[key as ResourceKey];
    const label = res?.label || key;
    const icon = res?.icon || key;
    const percent = Number(eff.params?.['percent']);
    return `Transfer ${percent}% of opponent's ${icon}${label} to you`;
  },
});
