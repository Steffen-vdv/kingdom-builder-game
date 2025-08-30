import { Stat } from '../state';

export const maxPopulation = {
  key: Stat.maxPopulation,
  icon: '👥',
  label: 'Max Population',
  description:
    'Max Population indicates how many inhabitants your realm can sustain. Building houses and certain effects raise this cap, allowing you to support more specialised roles.',
};
export type MaxPopulationInfo = typeof maxPopulation;
