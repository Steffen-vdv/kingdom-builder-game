import { statInfo } from '@kingdom-builder/engine';
import { gainOrLose, signed } from '../../helpers';
import { registerStatAddFormatter } from './registry';

registerStatAddFormatter('*', {
  summarize: (eff) => {
    const key = eff.params?.['key'] as string;
    const stat = statInfo[key as keyof typeof statInfo];
    const icon = stat ? stat.icon : key;
    const amount = Number(eff.params?.['amount']);
    return `${icon}${signed(amount)}${amount}`;
  },
  describe: (eff) => {
    const key = eff.params?.['key'] as string;
    const stat = statInfo[key as keyof typeof statInfo];
    const label = stat?.label || key;
    const icon = stat?.icon || '';
    const amount = Number(eff.params?.['amount']);
    return `${gainOrLose(amount)} ${Math.abs(amount)} ${icon} ${label}`;
  },
});
