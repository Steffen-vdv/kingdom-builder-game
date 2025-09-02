import { POPULATION_ROLES } from '@kingdom-builder/contents';
import type { EffectDef } from '@kingdom-builder/engine';
import { registerEffectFormatter } from '../factory';
import { signed } from '../helpers';

function summarizeChange(eff: EffectDef, delta: number) {
  const role = eff.params?.['role'] as
    | keyof typeof POPULATION_ROLES
    | undefined;
  const icon = role ? POPULATION_ROLES[role]?.icon || role : '👥';
  return `👥(${icon}) ${signed(delta)}${Math.abs(delta)}`;
}

function describeChange(eff: EffectDef, verb: string) {
  const role = eff.params?.['role'] as
    | keyof typeof POPULATION_ROLES
    | undefined;
  const info = role ? POPULATION_ROLES[role] : undefined;
  const label = info?.label || role || 'population';
  const icon = info?.icon || '';
  return `${verb} ${icon} ${label}`;
}

registerEffectFormatter('population', 'add', {
  summarize: (eff) => summarizeChange(eff, 1),
  describe: (eff) => describeChange(eff, 'Add'),
});

registerEffectFormatter('population', 'remove', {
  summarize: (eff) => summarizeChange(eff, -1),
  describe: (eff) => describeChange(eff, 'Remove'),
});
