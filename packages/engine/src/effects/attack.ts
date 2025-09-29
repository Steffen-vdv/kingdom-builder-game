import type { EffectDef, EffectHandler } from '.';
import type { EngineContext } from '../context';
import type { PlayerState, ResourceKey, StatKey } from '../state';
import type { ResourceGain } from '../services';
import { runEffects } from '.';
import { collectTriggerEffects } from '../triggers';
import { withStatSourceFrames } from '../stat_sources';

export interface AttackCalcOptions {
  ignoreAbsorption?: boolean;
  ignoreFortification?: boolean;
}

export type AttackTarget =
  | { type: 'resource'; key: ResourceKey }
  | { type: 'stat'; key: StatKey };

export function resolveAttack(
  defender: PlayerState,
  damage: number,
  ctx: EngineContext,
  target: AttackTarget,
  opts: AttackCalcOptions = {},
): number {
  const original = ctx.game.currentPlayerIndex;
  const defenderIndex = ctx.game.players.indexOf(defender);

  ctx.game.currentPlayerIndex = defenderIndex;
  const pre = collectTriggerEffects('onBeforeAttacked', ctx, defender);
  for (const bundle of pre)
    withStatSourceFrames(ctx, bundle.frames, () =>
      runEffects(bundle.effects, ctx),
    );

  ctx.game.currentPlayerIndex = original;

  const absorb = opts.ignoreAbsorption
    ? 0
    : Math.min(
        (defender.absorption as number) || 0,
        ctx.services.rules.absorptionCapPct,
      );
  let reduced = damage * (1 - absorb);
  const rounding = ctx.services.rules.absorptionRounding;
  if (rounding === 'down') reduced = Math.floor(reduced);
  else if (rounding === 'up') reduced = Math.ceil(reduced);
  else reduced = Math.round(reduced);

  const fortDamage = opts.ignoreFortification
    ? 0
    : Math.min((defender.fortificationStrength as number) || 0, reduced);
  if (fortDamage > 0)
    defender.fortificationStrength =
      (defender.fortificationStrength || 0) - fortDamage;
  const targetDamage = reduced - fortDamage;
  if (targetDamage > 0) {
    if (target.type === 'stat')
      defender.stats[target.key] = Math.max(
        0,
        (defender.stats[target.key] || 0) - targetDamage,
      );
    else
      defender.resources[target.key] = Math.max(
        0,
        (defender.resources[target.key] || 0) - targetDamage,
      );
  }

  ctx.game.currentPlayerIndex = defenderIndex;
  const post = collectTriggerEffects('onAttackResolved', ctx, defender);
  for (const bundle of post)
    withStatSourceFrames(ctx, bundle.frames, () =>
      runEffects(bundle.effects, ctx),
    );
  if ((defender.fortificationStrength || 0) < 0)
    defender.fortificationStrength = 0;
  ctx.game.currentPlayerIndex = original;
  return targetDamage;
}

export const attackPerform: EffectHandler = (effect, ctx) => {
  const attacker = ctx.activePlayer;
  const defender = ctx.opponent;
  const params = effect.params || {};
  const target = params['target'] as AttackTarget;
  if (!target) return;
  const mods: ResourceGain[] = [
    { key: target.key, amount: attacker.armyStrength as number },
  ];
  ctx.passives.runEvaluationMods('attack:power', ctx, mods);
  const damage = mods[0]!.amount;
  const { onDamage, ...calcOpts } = params as {
    onDamage?: { attacker?: EffectDef[]; defender?: EffectDef[] };
  } & AttackCalcOptions;
  const targetDamage = resolveAttack(defender, damage, ctx, target, calcOpts);
  if (targetDamage > 0 && onDamage) {
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
