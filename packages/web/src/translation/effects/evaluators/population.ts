import { POPULATION_ROLES } from '@kingdom-builder/contents';
import { registerEvaluatorFormatter } from '../factory';

registerEvaluatorFormatter('population', {
  summarize: (ev, sub) => {
    const role = (ev.params as Record<string, string>)?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const icon = role ? POPULATION_ROLES[role]?.icon || role : '👥';
    return sub.map((s) => `${s} per ${icon}`);
  },
  describe: (ev, sub) => {
    const role = (ev.params as Record<string, string>)?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    if (role) {
      const info = POPULATION_ROLES[role];
      return sub.map((s) =>
        `${s} for each ${info?.icon || ''}${info?.label || role}`.trim(),
      );
    }
    return sub.map((s) => `${s} for each population`);
  },
});
