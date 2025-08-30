import { statInfo } from '../../../../icons';
import { increaseOrDecrease, signed } from '../../helpers';
import { registerEffectFormatter } from '../../factory';
import { applyStatAddFormatter } from './registry';

registerEffectFormatter('stat', 'add', {
  summarize: (eff, ctx) => applyStatAddFormatter(eff, ctx, 'summarize'),
  describe: (eff, ctx) => applyStatAddFormatter(eff, ctx, 'describe'),
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

import './default';
import './maxPopulation';
import './absorption';
