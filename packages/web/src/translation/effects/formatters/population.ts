import { POPULATION_ROLES } from '@kingdom-builder/contents';
import type { EffectDef } from '@kingdom-builder/engine';
import { registerEffectFormatter } from '../factory';
import { getPopulationInfo, signed } from '../helpers';

function summarizeChange(eff: EffectDef, delta: number) {
  const role = eff.params?.['role'] as
    | keyof typeof POPULATION_ROLES
    | undefined;
  const { icon: popIcon } = getPopulationInfo();
  const icon = role ? POPULATION_ROLES[role]?.icon || role : popIcon || '👥';
  return `${popIcon || '👥'}(${icon}) ${signed(delta)}${Math.abs(delta)}`;
}

function describeChange(eff: EffectDef, verb: string) {
  const role = eff.params?.['role'] as
    | keyof typeof POPULATION_ROLES
    | undefined;
  if (role) {
    const info = POPULATION_ROLES[role];
    const icon = info?.icon || '';
    const label = info?.label || role;
    return `${verb} ${icon} ${label}`.trim();
  }
  const { icon, name } = getPopulationInfo();
  return `${verb} ${icon} ${name}`.trim();
}

registerEffectFormatter('population', 'add', {
  summarize: (eff) => summarizeChange(eff, 1),
  describe: (eff) => describeChange(eff, 'Add'),
});

registerEffectFormatter('population', 'remove', {
  summarize: (eff) => summarizeChange(eff, -1),
  describe: (eff) => describeChange(eff, 'Remove'),
});
