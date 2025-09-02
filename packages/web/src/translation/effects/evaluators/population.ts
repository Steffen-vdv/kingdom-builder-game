import { POPULATION_ROLES } from '@kingdom-builder/contents';
import { registerEvaluatorFormatter } from '../factory';
import { getPopulationInfo } from '../helpers';

registerEvaluatorFormatter('population', {
  summarize: (ev, sub) => {
    const role = (ev.params as Record<string, string>)?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const { icon: generic } = getPopulationInfo();
    const icon = role ? POPULATION_ROLES[role]?.icon || role : generic || '👥';
    return sub.map((s) =>
      typeof s === 'string'
        ? `${s} per ${icon}`
        : { ...s, title: `${s.title} per ${icon}` },
    );
  },
  describe: (ev, sub) => {
    const role = (ev.params as Record<string, string>)?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    if (role) {
      const info = POPULATION_ROLES[role];
      const icon = info?.icon || '';
      const label = info?.label || role;
      return sub.map((s) =>
        typeof s === 'string'
          ? `${s} for each ${icon} ${label}`.trim()
          : {
              ...s,
              title: `${s.title} for each ${icon} ${label}`.trim(),
            },
      );
    }
    const { icon, name } = getPopulationInfo();
    return sub.map((s) =>
      typeof s === 'string'
        ? `${s} for each ${icon} ${name}`.trim()
        : { ...s, title: `${s.title} for each ${icon} ${name}`.trim() },
    );
  },
});
