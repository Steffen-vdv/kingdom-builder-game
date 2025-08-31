import { STATS } from '@kingdom-builder/contents';
import { increaseOrDecrease, signed } from '../../helpers';
import { registerStatAddFormatter } from './registry';

registerStatAddFormatter('absorption', {
  summarize: (eff) => {
    const amount = Number(eff.params?.['amount']);
    const stat = STATS['absorption'];
    const icon = stat ? stat.icon : 'absorption';
    return `${icon}${signed(amount * 100)}${amount * 100}%`;
  },
  describe: (eff) => {
    const amount = Number(eff.params?.['amount']);
    const stat = STATS['absorption'];
    const label = stat?.label || 'absorption';
    const icon = stat?.icon || '';
    return `${increaseOrDecrease(amount)} ${icon}${label} by ${amount * 100}%`;
  },
});
