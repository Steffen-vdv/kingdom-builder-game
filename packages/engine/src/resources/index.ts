import type { ResourceKey } from '../state';
import { gold } from './gold';
import { ap } from './ap';
import { happiness } from './happiness';
import { castleHP } from './castle_hp';

export interface ResourceInfo {
  key: ResourceKey;
  icon: string;
  label: string;
  description: string;
}

export const RESOURCES: Record<ResourceKey, ResourceInfo> = {
  [gold.key]: gold,
  [ap.key]: ap,
  [happiness.key]: happiness,
  [castleHP.key]: castleHP,
};

export { gold, ap, happiness, castleHP };
