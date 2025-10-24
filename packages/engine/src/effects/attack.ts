import type {
	AttackCalcOptions,
	AttackLogOwner,
	AttackOnDamageLogEntry,
	AttackTarget,
} from '@kingdom-builder/protocol';
import type { EffectDef, EffectHandler } from '.';
import type { ResourceGain } from '../services';
import { runEffects } from '.';
import { snapshotPlayer } from '../log';
import { attackTargetHandlers } from './attack_target_handlers';
import { diffPlayerSnapshots } from './attack/snapshot_diff';
import { resolveAttack } from './attack/resolve';

export type {
	AttackCalcOptions,
	AttackEvaluationLog,
	AttackLog,
	AttackLogOwner,
	AttackOnDamageLogEntry,
	AttackPlayerDiff,
	AttackPowerLog,
	AttackTarget,
	AttackEvaluationTargetLog,
} from '@kingdom-builder/protocol';
export { resolveAttack } from './attack/resolve';
type RawAttackStatParam = {
	role?: unknown;
	key?: unknown;
};

type AttackEffectParams = {
	target?: AttackTarget;
	stats?: RawAttackStatParam[];
	ignoreAbsorption?: boolean;
	ignoreFortification?: boolean;
	onDamage?: { attacker?: EffectDef[]; defender?: EffectDef[] };
};

function resolveAbsorptionResourceId(
	stats: RawAttackStatParam[] | undefined,
): string | undefined {
	if (!Array.isArray(stats)) {
		return undefined;
	}

	for (const entry of stats) {
		if (!entry || typeof entry !== 'object') {
			continue;
		}

		if (entry.role === 'absorption' && typeof entry.key === 'string') {
			return entry.key;
		}
	}

	return undefined;
}

export const attackPerform: EffectHandler = (effectDefinition, context) => {
	const attacker = context.activePlayer;
	const defender = context.opponent;
	const effectParams = (effectDefinition.params || {}) as AttackEffectParams;
	const target = effectParams.target;
	if (!target) {
		return;
	}

	const baseDamage = (attacker.armyStrength as number) || 0;
	const targetHandler = attackTargetHandlers[target.type];
	const evaluationKey = targetHandler.getEvaluationModifierKey(target as never);
	const powerModifiers: ResourceGain[] = [
		{ key: evaluationKey, amount: baseDamage },
	];
	context.passives.runEvaluationMods('attack:power', context, powerModifiers);
	const modifiedDamage = powerModifiers[0]!.amount;

	const absorptionResourceId = resolveAbsorptionResourceId(effectParams.stats);
	const calcOptions: AttackCalcOptions = {
		...(effectParams.ignoreAbsorption !== undefined
			? {
					ignoreAbsorption: effectParams.ignoreAbsorption,
				}
			: {}),
		...(effectParams.ignoreFortification !== undefined
			? {
					ignoreFortification: effectParams.ignoreFortification,
				}
			: {}),
		...(absorptionResourceId ? { absorptionResourceId } : {}),
	};
	const { onDamage } = effectParams;

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
