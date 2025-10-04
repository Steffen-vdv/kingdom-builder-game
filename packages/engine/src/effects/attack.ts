import type { EffectDef, EffectHandler } from '.';
import type { ResourceGain } from '../services';
import { runEffects } from '.';
import { snapshotPlayer } from '../log';
import type { AttackTarget } from './attack.types';
import { attackTargetHandlers } from './attack_target_handlers';
import { diffPlayerSnapshots } from './attack/snapshot_diff';
import type {
	AttackCalcOptions,
	AttackLogOwner,
	AttackOnDamageLogEntry,
} from './attack/log.types';
import { resolveAttack } from './attack/resolve';

export type { AttackPlayerDiff } from './attack/snapshot_diff';
export type {
	AttackCalcOptions,
	AttackEvaluationLog,
	AttackLog,
	AttackLogOwner,
	AttackOnDamageLogEntry,
	AttackPowerLog,
} from './attack/log.types';

export {
	type AttackTarget,
	type AttackEvaluationTargetLog,
} from './attack.types';
export { resolveAttack } from './attack/resolve';
export const attackPerform: EffectHandler = (effectDefinition, context) => {
	const attacker = context.activePlayer;
	const defender = context.opponent;
	const effectParams = effectDefinition.params || {};
	const target = effectParams['target'] as AttackTarget | undefined;
	if (!target) {
		return;
	}

	const baseDamage = (attacker.armyStrength as number) || 0;
	const targetHandler = attackTargetHandlers[target.type];
	const evaluationKey = targetHandler.getEvaluationModifierKey(target as never);
	const powerModifiers: ResourceGain[] = [
		{ key: evaluationKey, amount: baseDamage },
	];
	context.passives.runEvaluationModifiers(
		'attack:power',
		context,
		powerModifiers,
	);
	const modifiedDamage = powerModifiers[0]!.amount;

	const { onDamage, ...calcOptions } = effectParams as {
		onDamage?: { attacker?: EffectDef[]; defender?: EffectDef[] };
	} & AttackCalcOptions;

	const result = resolveAttack(
		defender,
		modifiedDamage,
		context,
		target,
		calcOptions,
		baseDamage,
	);

	const onDamageLogs: AttackOnDamageLogEntry[] = [];

	if (result.damageDealt > 0 && onDamage) {
		const runList = (
			owner: AttackLogOwner,
			effectDefinitions: EffectDef[] | undefined,
		) => {
			if (!effectDefinitions?.length) {
				return;
			}
			const defenderIndex = context.game.players.indexOf(defender);
			const originalIndex = context.game.currentPlayerIndex;
			if (owner === 'defender') {
				context.game.currentPlayerIndex = defenderIndex;
			}
			try {
				for (const effectDef of effectDefinitions) {
					const beforeAttacker = snapshotPlayer(attacker, context);
					const beforeDefender = snapshotPlayer(defender, context);
					runEffects([effectDef], context);
					const afterAttacker = snapshotPlayer(attacker, context);
					const afterDefender = snapshotPlayer(defender, context);
					onDamageLogs.push({
						owner,
						effect: effectDef,
						attacker: diffPlayerSnapshots(beforeAttacker, afterAttacker),
						defender: diffPlayerSnapshots(beforeDefender, afterDefender),
					});
				}
			} finally {
				if (owner === 'defender') {
					context.game.currentPlayerIndex = originalIndex;
				}
			}
		};

		runList('defender', onDamage.defender);
		runList('attacker', onDamage.attacker);
	}

	context.pushEffectLog('attack:perform', {
		evaluation: result.evaluation,
		onDamage: onDamageLogs,
	});
};

export default attackPerform;
