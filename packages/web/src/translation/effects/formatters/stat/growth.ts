import { STATS } from '@kingdom-builder/contents';
import { increaseOrDecrease, signed } from '../../helpers';
import { registerStatAddFormatter } from './registry';

registerStatAddFormatter('growth', {
  summarize: (eff) => {
    const amount = Number(eff.params?.['amount']);
    const stat = STATS['growth'];
    const icon = stat ? stat.icon : 'growth';
    return `${icon}${signed(amount * 100)}${amount * 100}%`;
  },
  describe: (eff) => {
    const amount = Number(eff.params?.['amount']);
    const stat = STATS['growth'];
    const label = stat?.label || 'growth';
    const icon = stat?.icon || '';
    return `${increaseOrDecrease(amount)} ${icon}${label} by ${amount * 100}%`;
  },
});
