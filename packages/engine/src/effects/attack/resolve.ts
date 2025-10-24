import type {
	AttackCalcOptions,
	AttackEvaluationLog,
	AttackTarget,
} from '@kingdom-builder/protocol';
import { runEffects } from '..';
import type { EngineContext } from '../../context';
import { withStatSourceFrames } from '../../stat_sources';
import { collectTriggerEffects } from '../../triggers';
import type { PlayerState } from '../../state';
import {
	attackTargetHandlers,
	type AttackTargetHandlerMeta,
} from '../attack_target_handlers';

interface AttackResolution {
	damageDealt: number;
	evaluation: AttackEvaluationLog;
}

function applyAbsorption(
	damage: number,
	absorption: number,
	rounding: 'up' | 'down' | 'nearest',
): number {
	if (absorption <= 0) {
		return damage;
	}

	const reduced = damage * (1 - absorption);

	if (rounding === 'down') {
		return Math.floor(reduced);
	}

	if (rounding === 'up') {
		return Math.ceil(reduced);
	}

	return Math.round(reduced);
}

export function resolveAttack(
	defender: PlayerState,
	damage: number,
	context: EngineContext,
	target: AttackTarget,
	options: AttackCalcOptions = {},
	baseDamage = damage,
): AttackResolution {
	const originalIndex = context.game.currentPlayerIndex;
	const defenderIndex = context.game.players.indexOf(defender);

	context.game.currentPlayerIndex = defenderIndex;
	const beforeAttackTriggers = collectTriggerEffects(
		'onBeforeAttacked',
		context,
		defender,
	);

	for (const triggerBundle of beforeAttackTriggers) {
		withStatSourceFrames(context, triggerBundle.frames, () =>
			runEffects(triggerBundle.effects, context),
		);
	}

	if (beforeAttackTriggers.length > 0) {
		runEffects(beforeAttackTriggers, context);
	}

	context.game.currentPlayerIndex = originalIndex;

	const absorptionResourceId = options.absorptionResourceId;
	const absorptionValue = absorptionResourceId
		? (defender.resourceV2.amounts[absorptionResourceId] ?? 0)
		: (defender.absorption as number) || 0;
	const absorption = options.ignoreAbsorption
		? 0
		: Math.min(absorptionValue, context.services.rules.absorptionCapPct);
	const damageAfterAbsorption = options.ignoreAbsorption
		? damage
		: applyAbsorption(
				damage,
				absorption,
				context.services.rules.absorptionRounding,
			);

	const fortBefore = (defender.fortificationStrength as number) || 0;
	const fortDamage = options.ignoreFortification
		? 0
		: Math.min(fortBefore, damageAfterAbsorption);
	const fortAfter = options.ignoreFortification
		? fortBefore
		: Math.max(0, fortBefore - fortDamage);
	if (!options.ignoreFortification) {
		defender.fortificationStrength = fortAfter;
	}

	const targetDamage = Math.max(0, damageAfterAbsorption - fortDamage);
	const handlerMeta: AttackTargetHandlerMeta = {
		defenderIndex,
		originalIndex,
	};
	const handler = attackTargetHandlers[target.type];
	const mutation = handler.applyDamage(
		target as never,
		targetDamage,
		context,
		defender,
		handlerMeta,
	);
	const targetLog = handler.buildLog(
		target as never,
		targetDamage,
		context,
		defender,
		handlerMeta,
		mutation as never,
	);

	context.game.currentPlayerIndex = defenderIndex;
	const afterAttackTriggers = collectTriggerEffects(
		'onAttackResolved',
		context,
		defender,
	);

	for (const triggerBundle of afterAttackTriggers) {
		withStatSourceFrames(context, triggerBundle.frames, () =>
			runEffects(triggerBundle.effects, context),
		);
	}

	if ((defender.fortificationStrength || 0) < 0) {
		defender.fortificationStrength = 0;
	}

	if (afterAttackTriggers.length > 0) {
		runEffects(afterAttackTriggers, context);
	}

	context.game.currentPlayerIndex = originalIndex;

	return {
		damageDealt: targetDamage,
		evaluation: {
			power: { base: baseDamage, modified: damage },
			absorption: {
				ignored: Boolean(options.ignoreAbsorption),
				before: absorption,
				damageAfter: damageAfterAbsorption,
			},
			fortification: {
				ignored: Boolean(options.ignoreFortification),
				before: fortBefore,
				damage: fortDamage,
				after: fortAfter,
			},
			target: targetLog,
		} satisfies AttackEvaluationLog,
	};
}

export type { AttackResolution };
