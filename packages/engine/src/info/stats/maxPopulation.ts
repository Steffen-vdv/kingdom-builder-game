import { Stat } from '../../state';

export const maxPopulation = {
  key: Stat.maxPopulation,
  icon: '👥',
  label: 'Max Population',
  description:
    'Max Population sets how many citizens your realm can support. Build houses or certain buildings to raise this cap and expand your workforce.',
} as const;
