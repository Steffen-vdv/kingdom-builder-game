import { Resource } from '../state';

export const gold = {
  key: Resource.gold,
  icon: '🪙',
  label: 'Gold',
  description:
    'Gold is the foundational currency of the realm. It is earned through developments and actions and spent to fund buildings, recruit population or pay for powerful plays. A healthy treasury keeps your options open.',
};
export type GoldInfo = typeof gold;
