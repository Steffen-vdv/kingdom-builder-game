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
  onBuild: { icon: '⚒️', label: 'Until removed' },
  onDevelopmentPhase: { icon: '🏗️', label: 'On each Development Phase' },
  onUpkeepPhase: { icon: '🧹', label: 'On each Upkeep Phase' },
  onAttackResolved: { icon: '⚔️', label: 'After having been attacked' },
  mainPhase: { icon: '🎯', label: 'Main phase' },
} as const;
