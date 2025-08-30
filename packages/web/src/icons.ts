import { PHASES } from '@kingdom-builder/engine';

export const actionInfo = {
  expand: { icon: '🌱' },
  overwork: { icon: '🛠️' },
  develop: { icon: '🏗️' },
  tax: { icon: '💰' },
  reallocate: { icon: '🔄' },
  raise_pop: { icon: '👶' },
  royal_decree: { icon: '📜' },
  army_attack: { icon: '🗡️' },
  hold_festival: { icon: '🎉' },
  plow: { icon: '🚜' },
  build: { icon: '🏛️' },
  'gain-income': { icon: '💰', label: 'Gain Income' },
} as const;

export const developmentInfo: Record<string, { icon: string; label: string }> =
  {
    house: { icon: '🏠', label: 'House' },
    farm: { icon: '🌾', label: 'Farm' },
    outpost: { icon: '🛡️', label: 'Outpost' },
    watchtower: { icon: '🗼', label: 'Watchtower' },
    garden: { icon: '🌿', label: 'Garden' },
  };

export const landIcon = '🗺️';
export const slotIcon = '🧩';
export const buildingIcon = '🏛️';

export const modifierInfo = {
  cost: { icon: '💲', label: 'Cost Modifier' },
  result: { icon: '✨', label: 'Result Modifier' },
} as const;

const phaseEntries = Object.fromEntries(
  PHASES.map((p) => [
    `on${p.id.charAt(0).toUpperCase() + p.id.slice(1)}Phase`,
    {
      icon: p.icon,
      future: `On each ${p.label} Phase`,
      past: `${p.label} Phase`,
    },
  ]),
);

const actionPhase = PHASES.find((p) => p.action);

export const phaseInfo = {
  onBuild: {
    icon: '⚒️',
    future: 'Until removed',
    past: 'Build',
  },
  onAttackResolved: {
    icon: '⚔️',
    future: 'After having been attacked',
    past: 'After attack',
  },
  mainPhase: {
    icon: actionPhase?.icon || '🎯',
    future: 'Immediately',
    past: `${actionPhase?.label ?? 'Main'} phase`,
  },
  ...phaseEntries,
} as const;
