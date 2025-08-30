import { Resource } from '../../state';

export const gold = {
  key: Resource.gold,
  icon: '🪙',
  label: 'Gold',
  description:
    'Gold is the kingdom\u2019s currency used to pay costs and upkeep. Your treasury can never go negative, so careful budgeting is vital.',
} as const;
