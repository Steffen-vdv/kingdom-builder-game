import { POPULATION_ROLES, POPULATION_INFO } from '@kingdom-builder/contents';
import { registerEvaluatorFormatter } from '../factory';

registerEvaluatorFormatter('population', {
  summarize: (ev, sub) => {
    const role = (ev.params as Record<string, string>)?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const info = role ? POPULATION_ROLES[role] : undefined;
    const icon = info?.icon || POPULATION_INFO.icon;
    const label = info?.label || role || POPULATION_INFO.label;
    return sub.map((s) =>
      typeof s === 'string'
        ? `${s} per ${icon} ${label}`.trim()
        : { ...s, title: `${s.title} per ${icon} ${label}`.trim() },
    );
  },
  describe: (ev, sub) => {
    const role = (ev.params as Record<string, string>)?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const info = role ? POPULATION_ROLES[role] : undefined;
    const icon = info?.icon || '';
    const label = info?.label || role || POPULATION_INFO.label;
    return sub.map((s) =>
      typeof s === 'string'
        ? `${s} for each ${icon} ${label}`.trim()
        : { ...s, title: `${s.title} for each ${icon} ${label}`.trim() },
    );
  },
});
