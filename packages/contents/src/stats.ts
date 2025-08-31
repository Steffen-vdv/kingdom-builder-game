import { statInfo } from './config/builders';

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

function createStatMap() {
  const list: StatInfo[] = [
    statInfo()
      .id(Stat.maxPopulation)
      .icon('👥')
      .label('Max Population')
      .description(
        'Max Population determines how many subjects your kingdom can sustain. Expand infrastructure or build houses to increase it.',
      )
      .addFormat({ prefix: 'Max ' })
      .build(),
    statInfo()
      .id(Stat.armyStrength)
      .icon('⚔️')
      .label('Army Strength')
      .description(
        'Army Strength reflects the overall power of your military forces. A higher value makes your attacks more formidable.',
      )
      .build(),
    statInfo()
      .id(Stat.fortificationStrength)
      .icon('🛡️')
      .label('Fortification Strength')
      .description(
        'Fortification Strength measures the resilience of your defenses. It reduces damage taken when enemies assault your castle.',
      )
      .build(),
    statInfo()
      .id(Stat.absorption)
      .icon('🌀')
      .label('Absorption')
      .description(
        'Absorption reduces incoming damage by a percentage. It represents magical barriers or tactical advantages that soften blows.',
      )
      .addFormat({ percent: true })
      .build(),
    statInfo()
      .id(Stat.growth)
      .icon('📈')
      .label('Growth')
      .description(
        'Growth increases Army and Fortification Strength during the Raise Strength step.',
      )
      .addFormat({ percent: true })
      .build(),
    statInfo()
      .id(Stat.warWeariness)
      .icon('💤')
      .label('War Weariness')
      .description(
        'War Weariness reflects the fatigue from prolonged conflict. High weariness can sap morale and hinder wartime efforts.',
      )
      .build(),
  ];
  return Object.fromEntries(list.map((s) => [s.key, s])) as Record<
    StatKey,
    StatInfo
  >;
}

export const STATS = createStatMap();
