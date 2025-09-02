import {
  STATS,
  Stat,
  type ActionDef,
  type DevelopmentDef,
  type BuildingDef,
} from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';

export const signed = (n: number): string => (n >= 0 ? '+' : '');
export const gainOrLose = (n: number): string => (n >= 0 ? 'Gain' : 'Lose');
export const increaseOrDecrease = (n: number): string =>
  n >= 0 ? 'Increase' : 'Decrease';

export function getActionInfo(ctx: EngineContext, id: string) {
  try {
    const action: ActionDef = ctx.actions.get(id);
    return { icon: action.icon ?? id, name: action.name ?? id };
  } catch {
    return { icon: id, name: id };
  }
}

export function getDevelopmentInfo(ctx: EngineContext, id: string) {
  try {
    const dev: DevelopmentDef = ctx.developments.get(id);
    return { icon: dev.icon ?? '', name: dev.name ?? id };
  } catch {
    return { icon: '', name: id };
  }
}

export function getBuildingInfo(ctx: EngineContext, id: string) {
  try {
    const b: BuildingDef = ctx.buildings.get(id);
    return { icon: b.icon ?? '', name: b.name ?? id };
  } catch {
    return { icon: '', name: id };
  }
}

export function getPopulationInfo() {
  const info = STATS[Stat.maxPopulation];
  const icon = info?.icon || '';
  const name = (info?.label || 'Population').replace(/^Max\s+/i, '');
  return { icon, name };
}
