import { Resource } from '../state';

export const happiness = {
  key: Resource.happiness,
  icon: '😊',
  label: 'Happiness',
  description:
    'Happiness reflects how content your citizens are. Certain events raise or lower it and some abilities require a joyful populace to function. Maintaining morale can unlock bonuses while neglect breeds unrest.',
};
export type HappinessInfo = typeof happiness;
