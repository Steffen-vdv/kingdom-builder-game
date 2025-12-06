import type { StatAttackTarget } from '@kingdom-builder/protocol';
import type { AttackTargetHandler, AttackTargetMutationResult } from './index';

const statHandler: AttackTargetHandler<
	StatAttackTarget,
	AttackTargetMutationResult<'stat'>
> = {
	getEvaluationModifierKey(target) {
		return target.key;
	},
	applyDamage(target, damage, _engineContext, defender) {
		// target.key is now a ResourceV2 ID - use resourceValues directly
		const before = defender.resourceValues[target.key] || 0;
		const after = Math.max(0, before - damage);
		if (damage > 0) {
			defender.resourceValues[target.key] = after;
		}
		return { before, after };
	},
	buildLog(target, damage, _engineContext, _defender, _meta, mutation) {
		return {
			type: 'stat',
			key: target.key,
			before: mutation.before,
			damage,
			after: mutation.after,
		};
	},
};

export default statHandler;
