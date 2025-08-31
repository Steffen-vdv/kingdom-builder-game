import type { EngineContext } from './context';
import type { PlayerState } from './state';
import type { EffectDef } from './effects';
import { applyParamsToEffects } from './utils';

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
    const list = getEffects(populationDefinition, trigger);
    if (!list) continue;
    for (let i = 0; i < Number(count); i++)
      effects.push(...list.map((e) => ({ ...e })));
  }
  for (const land of player.lands) {
    for (const id of land.developments) {
      const developmentDefinition = ctx.developments.get(id);
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
    const list = getEffects(buildingDefinition, trigger);
    if (list) effects.push(...list.map((e) => ({ ...e })));
  }
  for (const passive of ctx.passives.values(player.id)) {
    const list = getEffects(passive, trigger);
    if (list) effects.push(...list.map((e) => ({ ...e })));
  }
  return effects;
}
