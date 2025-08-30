import { populationInfo } from '../../../icons';
import { registerEvaluatorFormatter } from '../factory';

registerEvaluatorFormatter('population', {
  summarize: (ev, sub) => {
    const role = (ev.params as Record<string, string>)?.['role'];
    const icon = role ? populationInfo[role]?.icon || role : '👥';
    return sub.map((s) => `${s} per ${icon}`);
  },
  describe: (ev, sub) => {
    const role = (ev.params as Record<string, string>)?.['role'];
    if (role) {
      const info = populationInfo[role];
      return sub.map((s) =>
        `${s} for each ${info?.icon || ''}${info?.label || role}`.trim(),
      );
    }
    return sub.map((s) => `${s} for each population`);
  },
});
