import type { EngineContext } from './context';
import type { PlayerState } from './state';
import type { EffectDef } from './effects';
import { applyParamsToEffects } from './utils';

function pushUpkeepEffect(
  effects: EffectDef[],
  source: Record<string, unknown>,
  key: string,
  amount: number,
) {
  effects.push({
    type: 'resource',
    method: 'remove',
    params: { key, amount },
    meta: { source },
  });
}

function getEffects(def: unknown, trigger: string): EffectDef[] | undefined {
  const val = (def as Record<string, unknown>)[trigger];
  return Array.isArray(val) ? (val as EffectDef[]) : undefined;
}

export function collectTriggerEffects(
  trigger: string,
  ctx: EngineContext,
  player: PlayerState = ctx.activePlayer,
): EffectDef[] {
  const effects: EffectDef[] = [];
  for (const [role, count] of Object.entries(player.population)) {
    const populationDefinition = ctx.populations.get(role);
    if (trigger === 'onPayUpkeepStep' && populationDefinition?.upkeep) {
      const qty = Number(count);
      for (const [key, amount] of Object.entries(populationDefinition.upkeep))
        pushUpkeepEffect(
          effects,
          { type: 'population', id: role, count: qty },
          key,
          amount * qty,
        );
    }
    const list = getEffects(populationDefinition, trigger);
    if (list)
      for (let i = 0; i < Number(count); i++)
        effects.push(...list.map((e) => ({ ...e })));
  }
  for (const land of player.lands) {
    if (trigger === 'onPayUpkeepStep' && land.upkeep) {
      for (const [key, amount] of Object.entries(land.upkeep))
        pushUpkeepEffect(effects, { type: 'land', id: land.id }, key, amount);
    }
    const landList = getEffects(land, trigger);
    if (landList)
      effects.push(
        ...applyParamsToEffects(landList, { landId: land.id }).map((e) => ({
          ...e,
        })),
      );
    for (const id of land.developments) {
      const developmentDefinition = ctx.developments.get(id);
      if (trigger === 'onPayUpkeepStep' && developmentDefinition?.upkeep) {
        for (const [key, amount] of Object.entries(
          developmentDefinition.upkeep,
        )) {
          pushUpkeepEffect(
            effects,
            { type: 'development', id, landId: land.id },
            key,
            amount,
          );
        }
      }
      const list = getEffects(developmentDefinition, trigger);
      if (!list) continue;
      effects.push(
        ...applyParamsToEffects(list, { landId: land.id, id }).map((e) => ({
          ...e,
        })),
      );
    }
  }
  for (const id of player.buildings) {
    const buildingDefinition = ctx.buildings.get(id);
    if (trigger === 'onPayUpkeepStep' && buildingDefinition?.upkeep) {
      for (const [key, amount] of Object.entries(buildingDefinition.upkeep))
        pushUpkeepEffect(effects, { type: 'building', id }, key, amount);
    }
    const list = getEffects(buildingDefinition, trigger);
    if (list) effects.push(...list.map((e) => ({ ...e })));
  }
  for (const passive of ctx.passives.values(player.id)) {
    const list = getEffects(passive, trigger);
    if (list) effects.push(...list.map((e) => ({ ...e })));
  }
  return effects;
}
