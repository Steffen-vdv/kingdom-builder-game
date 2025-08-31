import { stat, type StatInfo, toRecord } from './config/builders';

export const Stat = {
  maxPopulation: 'maxPopulation',
  armyStrength: 'armyStrength',
  fortificationStrength: 'fortificationStrength',
  absorption: 'absorption',
  growth: 'growth',
  warWeariness: 'warWeariness',
} as const;
export type StatKey = (typeof Stat)[keyof typeof Stat];

const defs: StatInfo[] = [
  stat(Stat.maxPopulation)
    .icon('👥')
    .label('Max Population')
    .description(
      'Max Population determines how many subjects your kingdom can sustain. Expand infrastructure or build houses to increase it.',
    )
    .addFormat({ prefix: 'Max ' })
    .build(),
  stat(Stat.armyStrength)
    .icon('⚔️')
    .label('Army Strength')
    .description(
      'Army Strength reflects the overall power of your military forces. A higher value makes your attacks more formidable.',
    )
    .build(),
  stat(Stat.fortificationStrength)
    .icon('🛡️')
    .label('Fortification Strength')
    .description(
      'Fortification Strength measures the resilience of your defenses. It reduces damage taken when enemies assault your castle.',
    )
    .build(),
  stat(Stat.absorption)
    .icon('🌀')
    .label('Absorption')
    .description(
      'Absorption reduces incoming damage by a percentage. It represents magical barriers or tactical advantages that soften blows.',
    )
    .displayAsPercent()
    .addFormat({ percent: true })
    .build(),
  stat(Stat.growth)
    .icon('📈')
    .label('Growth')
    .description(
      'Growth increases Army and Fortification Strength during the Raise Strength step.',
    )
    .displayAsPercent()
    .addFormat({ percent: true })
    .build(),
  stat(Stat.warWeariness)
    .icon('💤')
    .label('War Weariness')
    .description(
      'War Weariness reflects the fatigue from prolonged conflict. High weariness can sap morale and hinder wartime efforts.',
    )
    .build(),
];

export const STATS: Record<StatKey, StatInfo> = toRecord(defs) as Record<
  StatKey,
  StatInfo
>;
