import { RESOURCES } from '@kingdom-builder/engine';
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
