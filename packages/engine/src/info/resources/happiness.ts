import { Resource } from '../../state';

export const happiness = {
  key: Resource.happiness,
  icon: '😊',
  label: 'Happiness',
  description:
    'Happiness represents your realm\u2019s morale on a scale from -10 to 10. High happiness boosts income and growth, while negative values can slow or stop progress.',
} as const;
