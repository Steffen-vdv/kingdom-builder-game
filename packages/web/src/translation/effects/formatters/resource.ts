import { resourceInfo } from '../../../icons';
import { signed } from '../helpers';
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
    const icon = res?.icon || key;
    const amount = Number(eff.params?.['amount']);
    return `${icon}${signed(amount)}${amount} ${label}`;
  },
});
