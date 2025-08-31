import { POPULATION_ROLES } from '@kingdom-builder/contents';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('population', 'add', {
  summarize: (eff) => {
    const role = eff.params?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const icon = role ? POPULATION_ROLES[role]?.icon || role : '👥';
    return `👥(${icon}) +1`;
  },
  describe: (eff) => {
    const role = eff.params?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const info = role ? POPULATION_ROLES[role] : undefined;
    const label = info?.label || role || 'population';
    const icon = info?.icon || '';
    return `Add ${icon} ${label}`;
  },
});

registerEffectFormatter('population', 'remove', {
  summarize: (eff) => {
    const role = eff.params?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const icon = role ? POPULATION_ROLES[role]?.icon || role : '👥';
    return `👥(${icon}) -1`;
  },
  describe: (eff) => {
    const role = eff.params?.['role'] as
      | keyof typeof POPULATION_ROLES
      | undefined;
    const info = role ? POPULATION_ROLES[role] : undefined;
    const label = info?.label || role || 'population';
    const icon = info?.icon || '';
    return `Remove ${icon} ${label}`;
  },
});
