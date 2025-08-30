import { Resource } from '../state';

export const castleHP = {
  key: Resource.castleHP,
  icon: '🏰',
  label: 'Castle HP',
  description:
    'Castle Health represents the structural integrity of your stronghold. Enemy assaults and certain costs can damage it, and if it ever falls to zero your reign ends. Protect it well to stay in the game.',
};
export type CastleHPInfo = typeof castleHP;
