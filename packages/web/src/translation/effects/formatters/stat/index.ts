import { STATS } from '@kingdom-builder/contents';
import { gainOrLose, increaseOrDecrease, signed } from '../../helpers';
import { registerEffectFormatter } from '../../factory';

registerEffectFormatter('stat', 'add', {
  summarize: (eff) => {
    const key = eff.params?.['key'] as string;
    const stat = STATS[key as keyof typeof STATS];
    const icon = stat?.icon || key;
    const amount = Number(eff.params?.['amount']);
    const format = stat?.addFormat;
    const prefix = format?.prefix || '';
    if (format?.percent) {
      const pct = amount * 100;
      return `${prefix}${icon}${signed(pct)}${pct}%`;
    }
    return `${prefix}${icon}${signed(amount)}${amount}`;
  },
  describe: (eff) => {
    const key = eff.params?.['key'] as string;
    const stat = STATS[key as keyof typeof STATS];
    const label = stat?.label || key;
    const icon = stat?.icon || '';
    const amount = Number(eff.params?.['amount']);
    const format = stat?.addFormat;
    const prefix = format?.prefix || '';
    if (format?.percent) {
      const pct = Math.abs(amount * 100);
      return `${increaseOrDecrease(amount)} ${icon}${label} by ${pct}%`;
    }
    if (prefix) {
      return `${increaseOrDecrease(amount)} ${prefix}${icon} by ${Math.abs(amount)}`;
    }
    return `${gainOrLose(amount)} ${Math.abs(amount)} ${icon} ${label}`;
  },
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
