import { POPULATION_ROLES, POPULATION_INFO } from '@kingdom-builder/contents';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('population', 'add', {
  summarize: (eff) => {
    const role = eff.params?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const icon = role
      ? POPULATION_ROLES[role]?.icon || role
      : POPULATION_INFO.icon;
    return `${POPULATION_INFO.icon}(${icon}) +1`;
  },
  describe: (eff) => {
    const role = eff.params?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const info = role ? POPULATION_ROLES[role] : undefined;
    const label = info?.label || role || POPULATION_INFO.label;
    const icon = info?.icon || '';
    return `Add ${icon} ${label}`;
  },
});

registerEffectFormatter('population', 'remove', {
  summarize: (eff) => {
    const role = eff.params?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const icon = role
      ? POPULATION_ROLES[role]?.icon || role
      : POPULATION_INFO.icon;
    return `${POPULATION_INFO.icon}(${icon}) -1`;
  },
  describe: (eff) => {
    const role = eff.params?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const info = role ? POPULATION_ROLES[role] : undefined;
    const label = info?.label || role || POPULATION_INFO.label;
    const icon = info?.icon || '';
    return `Remove ${icon} ${label}`;
  },
});
