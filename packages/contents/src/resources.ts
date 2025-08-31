import { resourceInfo } from './config/builders';

export const Resource = {
  gold: 'gold',
  ap: 'ap',
  happiness: 'happiness',
  castleHP: 'castleHP',
} as const;
export type ResourceKey = (typeof Resource)[keyof typeof Resource];

export interface ResourceInfo {
  key: ResourceKey;
  icon: string;
  label: string;
  description: string;
}

function createResourceMap() {
  const list: ResourceInfo[] = [
    resourceInfo()
      .id(Resource.gold)
      .icon('🪙')
      .label('Gold')
      .description(
        'Gold is the foundational currency of the realm. It is earned through developments and actions and spent to fund buildings, recruit population or pay for powerful plays. A healthy treasury keeps your options open.',
      )
      .build(),
    resourceInfo()
      .id(Resource.ap)
      .icon('⚡')
      .label('Action Points')
      .description(
        'Action Points govern how many actions you can perform during your turn. Plan carefully: once you run out of AP, your main phase ends.',
      )
      .build(),
    resourceInfo()
      .id(Resource.happiness)
      .icon('😊')
      .label('Happiness')
      .description(
        'Happiness measures the contentment of your subjects. High happiness keeps morale up, while low happiness can lead to unrest or negative effects.',
      )
      .build(),
    resourceInfo()
      .id(Resource.castleHP)
      .icon('🏰')
      .label('Castle HP')
      .description(
        'Castle HP represents the durability of your stronghold. If it ever drops to zero, your kingdom falls and the game is lost.',
      )
      .build(),
  ];
  return Object.fromEntries(list.map((r) => [r.key, r])) as Record<
    ResourceKey,
    ResourceInfo
  >;
}

export const RESOURCES = createResourceMap();
