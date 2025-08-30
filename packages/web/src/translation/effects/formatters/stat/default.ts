import { STATS } from '@kingdom-builder/engine';
import { gainOrLose, signed } from '../../helpers';
import { registerStatAddFormatter } from './registry';

registerStatAddFormatter('*', {
  summarize: (eff) => {
    const key = eff.params?.['key'] as string;
    const stat = STATS[key as keyof typeof STATS];
    const icon = stat ? stat.icon : key;
    const amount = Number(eff.params?.['amount']);
    return `${icon}${signed(amount)}${amount}`;
  },
  describe: (eff) => {
    const key = eff.params?.['key'] as string;
    const stat = STATS[key as keyof typeof STATS];
    const label = stat?.label || key;
    const icon = stat?.icon || '';
    const amount = Number(eff.params?.['amount']);
    return `${gainOrLose(amount)} ${Math.abs(amount)} ${icon} ${label}`;
  },
});
