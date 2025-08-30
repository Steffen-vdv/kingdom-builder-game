import { populationInfo } from '@kingdom-builder/engine';
import { registerEvaluatorFormatter } from '../factory';

registerEvaluatorFormatter('population', {
  summarize: (ev, sub) => {
    const role = (ev.params as Record<string, string> | undefined)?.['role'];
    const icon = role
      ? populationInfo[role as keyof typeof populationInfo]?.icon || role
      : '👥';
    return sub.map((s) => `${s} per ${icon}`);
  },
  describe: (ev, sub) => {
    const role = (ev.params as Record<string, string> | undefined)?.['role'];
    const info = role
      ? populationInfo[role as keyof typeof populationInfo]
      : undefined;
    const label = role ? info?.label || role : 'population';
    const icon = info?.icon || (role ? '' : '👥');
    return sub.map((s) => `${s} for each ${icon}${label}`);
  },
});
