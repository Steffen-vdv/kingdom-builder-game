import { gold } from './gold';
import { ap } from './ap';
import { happiness } from './happiness';
import { castleHP } from './castleHP';

export const resourceInfo = {
  [gold.key]: gold,
  [ap.key]: ap,
  [happiness.key]: happiness,
  [castleHP.key]: castleHP,
} as const;

export { gold, ap, happiness, castleHP };
