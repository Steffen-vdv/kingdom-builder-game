import { STATS } from '@kingdom-builder/contents';
import { signed } from '../../helpers';
import { registerStatAddFormatter } from './registry';

registerStatAddFormatter('maxPopulation', {
  summarize: (eff) => {
    const amount = Number(eff.params?.['amount']);
    const icon = STATS['maxPopulation']?.icon || 'maxPopulation';
    return `Max ${icon}${signed(amount)}${amount}`;
  },
  describe: (eff) => {
    const amount = Number(eff.params?.['amount']);
    const icon = STATS['maxPopulation']?.icon || '';
    return `Increase Max ${icon} by ${amount}`;
  },
});
