import type { EngineContext } from './context';
import type { PlayerState } from './state';
import type { EffectDef } from './effects';
import type { StatSourceFrame } from './stat_sources';
import { applyParamsToEffects } from './utils';

export interface TriggerEffectBundle {
  effects: EffectDef[];
  frames?: StatSourceFrame | StatSourceFrame[];
}

function pushUpkeepEffect(
  bundles: TriggerEffectBundle[],
  source: Record<string, unknown>,
  key: string,
  amount: number,
) {
  bundles.push({
    effects: [
      {
        type: 'resource',
        method: 'remove',
        params: { key, amount },
        meta: { source },
      },
    ],
  });
}

function cloneEffect(effect: EffectDef): EffectDef {
  const cloned: EffectDef = { ...effect };
  if (effect.effects) cloned.effects = effect.effects.map(cloneEffect);
  return cloned;
}

function getEffects(def: unknown, trigger: string): EffectDef[] | undefined {
  const val = (def as Record<string, unknown>)[trigger];
  return Array.isArray(val) ? (val as EffectDef[]) : undefined;
}

export function collectTriggerEffects(
  trigger: string,
  ctx: EngineContext,
  player: PlayerState = ctx.activePlayer,
): TriggerEffectBundle[] {
  const bundles: TriggerEffectBundle[] = [];
  for (const [role, count] of Object.entries(player.population)) {
    const populationDefinition = ctx.populations.get(role);
    if (trigger === 'onPayUpkeepStep' && populationDefinition?.upkeep) {
      const qty = Number(count);
      for (const [key, amount] of Object.entries(populationDefinition.upkeep))
        pushUpkeepEffect(
          bundles,
          { type: 'population', id: role, count: qty },
          key,
          amount * qty,
        );
    }
    const list = getEffects(populationDefinition, trigger);
    if (list) {
      const clones: EffectDef[] = [];
      for (let i = 0; i < Number(count); i++)
        clones.push(...list.map(cloneEffect));
      if (clones.length)
        bundles.push({
          effects: clones,
          frames: () => ({
            kind: 'population',
            id: role,
            dependsOn: [{ type: 'population', id: role }],
          }),
        });
    }
  }
  for (const land of player.lands) {
    if (trigger === 'onPayUpkeepStep' && land.upkeep) {
      for (const [key, amount] of Object.entries(land.upkeep))
        pushUpkeepEffect(bundles, { type: 'land', id: land.id }, key, amount);
    }
    const landList = getEffects(land, trigger);
    if (landList) {
      const clones = applyParamsToEffects(landList, { landId: land.id }).map(
        cloneEffect,
      );
      if (clones.length) bundles.push({ effects: clones });
    }
    for (const id of land.developments) {
      const developmentDefinition = ctx.developments.get(id);
      if (trigger === 'onPayUpkeepStep' && developmentDefinition?.upkeep) {
        for (const [key, amount] of Object.entries(
          developmentDefinition.upkeep,
        )) {
          pushUpkeepEffect(
            bundles,
            { type: 'development', id, landId: land.id },
            key,
            amount,
          );
        }
      }
      const list = getEffects(developmentDefinition, trigger);
      if (!list) continue;
      const clones = applyParamsToEffects(list, { landId: land.id, id }).map(
        cloneEffect,
      );
      if (clones.length)
        bundles.push({
          effects: clones,
          frames: () => ({
            kind: 'development',
            id,
            dependsOn: [{ type: 'development', id }],
          }),
        });
    }
  }
  for (const id of player.buildings) {
    const buildingDefinition = ctx.buildings.get(id);
    if (trigger === 'onPayUpkeepStep' && buildingDefinition?.upkeep) {
      for (const [key, amount] of Object.entries(buildingDefinition.upkeep))
        pushUpkeepEffect(bundles, { type: 'building', id }, key, amount);
    }
    const list = getEffects(buildingDefinition, trigger);
    if (list) {
      const clones = list.map(cloneEffect);
      if (clones.length)
        bundles.push({
          effects: clones,
          frames: () => ({
            kind: 'building',
            id,
            dependsOn: [{ type: 'building', id }],
          }),
        });
    }
  }
  for (const passive of ctx.passives.values(player.id)) {
    const list = getEffects(passive, trigger);
    if (list) {
      const clones = list.map(cloneEffect);
      if (clones.length)
        bundles.push({ effects: clones, frames: passive.frames });
    }
  }
  return bundles;
}
