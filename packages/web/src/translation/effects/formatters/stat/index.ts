import { STATS } from '@kingdom-builder/contents';
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
    const stat = STATS[key as keyof typeof STATS];
    const icon = stat ? stat.icon : key;
    const percent = eff.params?.['percent'];
    if (percent !== undefined) {
      const pct = Number(percent) * 100;
      return `${icon}${signed(pct)}${pct}%`;
    }
    const pctStat = eff.params?.['percentStat'] as string | undefined;
    if (pctStat) {
      const pctIcon = STATS[pctStat as keyof typeof STATS]?.icon || pctStat;
      return `${icon}${pctIcon}`;
    }
    return icon;
  },
  describe: (eff) => {
    const key = eff.params?.['key'] as string;
    const stat = STATS[key as keyof typeof STATS];
    const label = stat?.label || key;
    const icon = stat?.icon || '';
    const percent = eff.params?.['percent'];
    if (percent !== undefined) {
      const raw = Number(percent);
      const pct = raw * 100;
      return `${increaseOrDecrease(raw)} ${icon}${label} by ${Math.abs(pct)}%`;
    }
    const pctStat = eff.params?.['percentStat'] as string | undefined;
    if (pctStat) {
      const pctInfo = STATS[pctStat as keyof typeof STATS];
      const pctIcon = pctInfo?.icon || '';
      const pctLabel = pctInfo?.label || pctStat;
      return `Increase ${icon}${label} by ${pctIcon}${pctLabel}`;
    }
    return `${increaseOrDecrease(0)} ${icon}${label}`;
  },
});

import './default';
import './maxPopulation';
import './absorption';
import './growth';
