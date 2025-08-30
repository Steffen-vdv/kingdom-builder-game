import { Resource } from '../../state';

export const castleHP = {
  key: Resource.castleHP,
  icon: '🏰',
  label: 'Castle HP',
  description:
    'Castle HP is the health of your stronghold and starts at ten. If it ever drops to zero, your kingdom falls and you lose the game.',
} as const;
