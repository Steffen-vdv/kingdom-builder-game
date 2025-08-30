import { resourceInfo } from '@kingdom-builder/engine';
import { gainOrLose, signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('resource', 'add', {
  summarize: (eff) => {
    const key = eff.params?.['key'] as string;
    const res = resourceInfo[key as keyof typeof resourceInfo];
    const icon = res ? res.icon : key;
    const amount = Number(eff.params?.['amount']);
    return `${icon}${signed(amount)}${amount}`;
  },
  describe: (eff) => {
    const key = eff.params?.['key'] as string;
    const res = resourceInfo[key as keyof typeof resourceInfo];
    const label = res?.label || key;
    const icon = res?.icon || '';
    const amount = Number(eff.params?.['amount']);
    return `${gainOrLose(amount)} ${Math.abs(amount)} ${icon} ${label}`;
  },
});
