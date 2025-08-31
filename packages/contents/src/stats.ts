export const Stat = {
  maxPopulation: 'maxPopulation',
  armyStrength: 'armyStrength',
  fortificationStrength: 'fortificationStrength',
  absorption: 'absorption',
  growth: 'growth',
  warWeariness: 'warWeariness',
} as const;
export type StatKey = (typeof Stat)[keyof typeof Stat];

export interface StatInfo {
  key: StatKey;
  icon: string;
  label: string;
  description: string;
  addFormat?: {
    prefix?: string;
    percent?: boolean;
  };
}

export const STATS: Record<StatKey, StatInfo> = {
  [Stat.maxPopulation]: {
    key: Stat.maxPopulation,
    icon: '👥',
    label: 'Max Population',
    description:
      'Max Population determines how many subjects your kingdom can sustain. Expand infrastructure or build houses to increase it.',
    addFormat: {
      prefix: 'Max ',
    },
  },
  [Stat.armyStrength]: {
    key: Stat.armyStrength,
    icon: '⚔️',
    label: 'Army Strength',
    description:
      'Army Strength reflects the overall power of your military forces. A higher value makes your attacks more formidable.',
  },
  [Stat.fortificationStrength]: {
    key: Stat.fortificationStrength,
    icon: '🛡️',
    label: 'Fortification Strength',
    description:
      'Fortification Strength measures the resilience of your defenses. It reduces damage taken when enemies assault your castle.',
  },
  [Stat.absorption]: {
    key: Stat.absorption,
    icon: '🌀',
    label: 'Absorption',
    description:
      'Absorption reduces incoming damage by a percentage. It represents magical barriers or tactical advantages that soften blows.',
    addFormat: {
      percent: true,
    },
  },
  [Stat.growth]: {
    key: Stat.growth,
    icon: '📈',
    label: 'Growth',
    description:
      'Growth increases Army and Fortification Strength during the Raise Strength step.',
    addFormat: {
      percent: true,
    },
  },
  [Stat.warWeariness]: {
    key: Stat.warWeariness,
    icon: '💤',
    label: 'War Weariness',
    description:
      'War Weariness reflects the fatigue from prolonged conflict. High weariness can sap morale and hinder wartime efforts.',
  },
};
