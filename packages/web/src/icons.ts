export const resourceInfo = {
  gold: { icon: '🪙', label: 'Gold' },
  ap: { icon: '⚡', label: 'Action Points' },
  happiness: { icon: '😊', label: 'Happiness' },
  castleHP: { icon: '🏰', label: 'Castle HP' },
} as const;

export const statInfo: Record<string, { icon: string; label: string }> = {
  maxPopulation: { icon: '👥', label: 'Max Population' },
  armyStrength: { icon: '🗡️', label: 'Army Strength' },
  fortificationStrength: { icon: '🛡️', label: 'Fortification Strength' },
  absorption: { icon: '🌀', label: 'Absorption' },
  armyGrowth: { icon: '📈', label: 'Army Growth' },
};

export const populationInfo: Record<string, { icon: string; label: string }> = {
  council: { icon: '⚖️', label: 'Council' },
  commander: { icon: '🎖️', label: 'Army Commander' },
  fortifier: { icon: '🧱', label: 'Fortifier' },
  citizen: { icon: '👤', label: 'Citizen' },
};

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

export const phaseInfo = {
  onBuild: {
    icon: '⚒️',
    future: 'Until removed',
    past: 'Build',
  },
  onDevelopmentPhase: {
    icon: '🏗️',
    future: 'On each Development Phase',
    past: 'Development Phase',
  },
  onUpkeepPhase: {
    icon: '🧹',
    future: 'On each Upkeep Phase',
    past: 'Upkeep Phase',
  },
  onAttackResolved: {
    icon: '⚔️',
    future: 'After having been attacked',
    past: 'After attack',
  },
  mainPhase: { icon: '🎯', future: 'Immediately', past: 'Main phase' },
} as const;
