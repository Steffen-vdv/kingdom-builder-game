import { statInfo } from '../../../../icons';
import { signed } from '../../helpers';
import { registerStatAddFormatter } from './registry';

registerStatAddFormatter('maxPopulation', {
  summarize: (eff) => {
    const amount = Number(eff.params?.['amount']);
    const icon = statInfo['maxPopulation']?.icon || 'maxPopulation';
    return `Max ${icon}${signed(amount)}${amount}`;
  },
  describe: (eff) => {
    const amount = Number(eff.params?.['amount']);
    const icon = statInfo['maxPopulation']?.icon || '';
    return `Increase Max ${icon} by ${amount}`;
  },
});
