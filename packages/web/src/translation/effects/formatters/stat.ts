import { statInfo } from '../../../icons';
import { gainOrLose, increaseOrDecrease, signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('stat', 'add', {
  summarize: (eff) => {
    const key = eff.params?.['key'] as string;
    const stat = statInfo[key];
    const icon = stat ? stat.icon : key;
    const amount = Number(eff.params?.['amount']);
    if (key === 'maxPopulation') return `Max ${icon}${signed(amount)}${amount}`;
    if (key === 'absorption')
      return `${icon}${signed(amount * 100)}${amount * 100}%`;
    return `${icon}${signed(amount)}${amount}`;
  },
  describe: (eff) => {
    const key = eff.params?.['key'] as string;
    const stat = statInfo[key];
    const label = stat?.label || key;
    const icon = stat?.icon || '';
    const amount = Number(eff.params?.['amount']);
    if (key === 'maxPopulation') return `Increase Max ${icon} by ${amount}`;
    if (key === 'absorption')
      return `${increaseOrDecrease(amount)} ${icon}${label} by ${
        amount * 100
      }%`;
    return `${gainOrLose(amount)} ${Math.abs(amount)} ${icon} ${label}`;
  },
});

registerEffectFormatter('stat', 'add_pct', {
  summarize: (eff) => {
    const key = eff.params?.['key'] as string;
    const stat = statInfo[key];
    const icon = stat ? stat.icon : key;
    const percent = Number(eff.params?.['percent']);
    return `${icon}${signed(percent)}${percent}%`;
  },
  describe: (eff) => {
    const key = eff.params?.['key'] as string;
    const stat = statInfo[key];
    const label = stat?.label || key;
    const icon = stat?.icon || '';
    const percent = Number(eff.params?.['percent']);
    return `${increaseOrDecrease(percent)} ${icon}${label} by ${Math.abs(
      percent,
    )}%`;
  },
});
