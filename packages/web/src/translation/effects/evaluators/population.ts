import { POPULATION_ROLES, POPULATION_INFO } from '@kingdom-builder/contents';
import { registerEvaluatorFormatter } from '../factory';

registerEvaluatorFormatter('population', {
  summarize: (ev, sub) => {
    const role = (ev.params as Record<string, string>)?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const icon = role
      ? POPULATION_ROLES[role]?.icon || role
      : POPULATION_INFO.icon;
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
      return sub.map((s) =>
        typeof s === 'string'
          ? `${s} for each ${info?.icon || ''}${info?.label || role}`.trim()
          : {
              ...s,
              title:
                `${s.title} for each ${info?.icon || ''}${info?.label || role}`.trim(),
            },
      );
    }
    return sub.map((s) =>
      typeof s === 'string'
        ? `${s} for each ${POPULATION_INFO.label.toLowerCase()}`
        : {
            ...s,
            title: `${s.title} for each ${POPULATION_INFO.label.toLowerCase()}`,
          },
    );
  },
});
