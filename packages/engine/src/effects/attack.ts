import type { EffectDef, EffectHandler } from '.';
import type { EngineContext } from '../context';
import { Resource, type PlayerState } from '../state';
import type { ResourceGain } from '../services';
import { runEffects } from '.';
import { collectTriggerEffects } from '../triggers';

export interface AttackCalcOptions {
  ignoreAbsorption?: boolean;
  ignoreFortification?: boolean;
}

export function resolveAttack(
  defender: PlayerState,
  damage: number,
  ctx: EngineContext,
  opts: AttackCalcOptions = {},
): number {
  const original = ctx.game.currentPlayerIndex;
  const defenderIndex = ctx.game.players.indexOf(defender);

  ctx.game.currentPlayerIndex = defenderIndex;
  const pre = collectTriggerEffects('onBeforeAttacked', ctx, defender);
  if (pre.length) runEffects(pre, ctx);

  ctx.game.currentPlayerIndex = original;

  const absorb = opts.ignoreAbsorption
    ? 0
    : Math.min(defender.absorption || 0, ctx.services.rules.absorptionCapPct);
  let reduced = damage * (1 - absorb);
  const rounding = ctx.services.rules.absorptionRounding;
  if (rounding === 'down') reduced = Math.floor(reduced);
  else if (rounding === 'up') reduced = Math.ceil(reduced);
  else reduced = Math.round(reduced);

  const fortDamage = opts.ignoreFortification
    ? 0
    : Math.min(defender.fortificationStrength || 0, reduced);
  if (fortDamage > 0)
    defender.fortificationStrength =
      (defender.fortificationStrength || 0) - fortDamage;
  const castleDamage = reduced - fortDamage;
  if (castleDamage > 0)
    defender.resources[Resource.castleHP] = Math.max(
      0,
      (defender.resources[Resource.castleHP] || 0) - castleDamage,
    );

  ctx.game.currentPlayerIndex = defenderIndex;
  const post = collectTriggerEffects('onAttackResolved', ctx, defender);
  if (post.length) runEffects(post, ctx);
  if ((defender.fortificationStrength || 0) < 0)
    defender.fortificationStrength = 0;
  ctx.game.currentPlayerIndex = original;
  return castleDamage;
}

export const attackPerform: EffectHandler = (effect, ctx) => {
  const attacker = ctx.activePlayer;
  const defender = ctx.opponent;
  const mods: ResourceGain[] = [
    { key: Resource.castleHP, amount: attacker.armyStrength },
  ];
  ctx.passives.runEvaluationMods('attack:power', ctx, mods);
  const damage = mods[0]!.amount;
  const castleDamage = resolveAttack(
    defender,
    damage,
    ctx,
    effect.params as AttackCalcOptions,
  );
  if (castleDamage > 0) {
    const onDamage = (effect.params?.['onCastleDamage'] || {}) as {
      attacker?: EffectDef[];
      defender?: EffectDef[];
    };
    if (onDamage.attacker?.length) runEffects(onDamage.attacker, ctx);
    if (onDamage.defender?.length) {
      const original = ctx.game.currentPlayerIndex;
      const defenderIndex = ctx.game.players.indexOf(defender);
      ctx.game.currentPlayerIndex = defenderIndex;
      runEffects(onDamage.defender, ctx);
      ctx.game.currentPlayerIndex = original;
    }
  }
};

export default attackPerform;
