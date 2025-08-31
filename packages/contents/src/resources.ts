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

export const RESOURCES: Record<ResourceKey, ResourceInfo> = {
  [Resource.gold]: {
    key: Resource.gold,
    icon: '🪙',
    label: 'Gold',
    description:
      'Gold is the foundational currency of the realm. It is earned through developments and actions and spent to fund buildings, recruit population or pay for powerful plays. A healthy treasury keeps your options open.',
  },
  [Resource.ap]: {
    key: Resource.ap,
    icon: '⚡',
    label: 'Action Points',
    description:
      'Action Points govern how many actions you can perform during your turn. Plan carefully: once you run out of AP, your main phase ends.',
  },
  [Resource.happiness]: {
    key: Resource.happiness,
    icon: '😊',
    label: 'Happiness',
    description:
      'Happiness measures the contentment of your subjects. High happiness keeps morale up, while low happiness can lead to unrest or negative effects.',
  },
  [Resource.castleHP]: {
    key: Resource.castleHP,
    icon: '🏰',
    label: 'Castle HP',
    description:
      'Castle HP represents the durability of your stronghold. If it ever drops to zero, your kingdom falls and the game is lost.',
  },
};
