import { applyParamsToEffects } from './utils';
import { runEffects } from './effects';
import type { EngineContext } from './context';
import type { PlayerState } from './state';
import type { TriggerKey } from './content/defs';
import type { EffectDef } from './effects';

export function runTrigger(
  trigger: TriggerKey,
  ctx: EngineContext,
  player: PlayerState = ctx.activePlayer,
  step?: string,
) {
  const original = ctx.game.currentPlayerIndex;
  const index = ctx.game.players.indexOf(player);
  ctx.game.currentPlayerIndex = index;

  for (const [role, count] of Object.entries(player.population)) {
    const populationDefinition = ctx.populations.get(role);
    const effects = populationDefinition[trigger];
    if (effects) {
      const filtered = step ? effects.filter((e) => e.step === step) : effects;
      if (filtered.length) runEffects(filtered, ctx, Number(count));
    }
  }

  for (const land of player.lands) {
    for (const id of land.developments) {
      const developmentDefinition = ctx.developments.get(id);
      const effects = developmentDefinition[trigger];
      if (!effects) continue;
      const filtered = step ? effects.filter((e) => e.step === step) : effects;
      if (!filtered.length) continue;
      runEffects(applyParamsToEffects(filtered, { landId: land.id, id }), ctx);
    }
  }

  for (const id of player.buildings) {
    const buildingDefinition = ctx.buildings.get(id);
    const effects = buildingDefinition[trigger];
    if (effects) {
      const filtered = step ? effects.filter((e) => e.step === step) : effects;
      if (filtered.length) runEffects(filtered, ctx);
    }
  }

  ctx.game.currentPlayerIndex = original;
}

export function collectTriggerEffects(
  trigger: TriggerKey,
  ctx: EngineContext,
  player: PlayerState = ctx.activePlayer,
  step?: string,
): EffectDef[] {
  const effects: EffectDef[] = [];
  for (const [role, count] of Object.entries(player.population)) {
    const populationDefinition = ctx.populations.get(role);
    const list = populationDefinition[trigger];
    if (!list) continue;
    const filtered = step ? list.filter((e) => e.step === step) : list;
    for (let i = 0; i < Number(count); i++)
      effects.push(...filtered.map((e) => ({ ...e })));
  }
  for (const land of player.lands) {
    for (const id of land.developments) {
      const developmentDefinition = ctx.developments.get(id);
      const list = developmentDefinition[trigger];
      if (!list) continue;
      const filtered = step ? list.filter((e) => e.step === step) : list;
      effects.push(
        ...applyParamsToEffects(filtered, { landId: land.id, id }).map((e) => ({
          ...e,
        })),
      );
    }
  }
  for (const id of player.buildings) {
    const buildingDefinition = ctx.buildings.get(id);
    const list = buildingDefinition[trigger];
    if (list) {
      const filtered = step ? list.filter((e) => e.step === step) : list;
      effects.push(...filtered.map((e) => ({ ...e })));
    }
  }
  return effects;
}
