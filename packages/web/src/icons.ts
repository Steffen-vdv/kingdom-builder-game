export const resourceInfo = {
  gold: {
    icon: '🪙',
    label: 'Gold',
    description:
      'Gold is the kingdom\u2019s currency used to pay costs and upkeep. Your treasury can never go negative, so careful budgeting is vital.',
  },
  ap: {
    icon: '⚡',
    label: 'Action Points',
    description:
      'Action Points measure how many moves you can make in the main phase. Each Council member generates one point during development, and most actions spend one.',
  },
  happiness: {
    icon: '😊',
    label: 'Happiness',
    description:
      'Happiness represents your realm\u2019s morale on a scale from -10 to 10. High happiness boosts income and growth, while negative values can slow or stop progress.',
  },
  castleHP: {
    icon: '🏰',
    label: 'Castle HP',
    description:
      'Castle HP is the health of your stronghold and starts at ten. If it ever drops to zero, your kingdom falls and you lose the game.',
  },
} as const;

export const statInfo: Record<
  string,
  { icon: string; label: string; description: string }
> = {
  maxPopulation: {
    icon: '👥',
    label: 'Max Population',
    description:
      'Max Population sets how many citizens your realm can support. Build houses or certain buildings to raise this cap and expand your workforce.',
  },
  armyStrength: {
    icon: '🗡️',
    label: 'Army Strength',
    description:
      'Army Strength reflects the offensive might of your forces. Commanders add flat strength and fuel growth during development.',
  },
  fortificationStrength: {
    icon: '🛡️',
    label: 'Fortification Strength',
    description:
      'Fortification Strength represents your defenses. Fortifiers bolster these walls and improve their growth each development phase.',
  },
  absorption: {
    icon: '🌀',
    label: 'Absorption',
    description:
      'Absorption reduces incoming damage by a percentage and can stack up to 100%. The reduction is applied after modifiers but before damage is taken.',
  },
  armyGrowth: {
    icon: '📈',
    label: 'Army Growth',
    description:
      'Army Growth is the percent increase to Army Strength applied every development phase. Each Commander grants 25% growth, though low happiness can halt it.',
  },
};

export const populationInfo: Record<string, { icon: string; label: string }> = {
  council: { icon: '⚖️', label: 'Council' },
  commander: { icon: '🎖️', label: 'Army Commander' },
  fortifier: { icon: '🧱', label: 'Fortifier' },
  citizen: { icon: '👤', label: 'Citizen' },
};

export const populationDescription =
  'Population represents your citizens who can take on various roles. Councils generate action points, Commanders and Fortifiers empower your military, and unassigned Citizens provide no benefit until allocated.';

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
