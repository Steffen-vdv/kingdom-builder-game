import type { AttackTargetHandler, AttackTargetMutationResult } from './index';
import type { ResourceAttackTarget } from '../attack.types';

const resourceHandler: AttackTargetHandler<
	ResourceAttackTarget,
	AttackTargetMutationResult<'resource'>
> = {
	getEvaluationModifierKey(target) {
		return target.key;
	},
	applyDamage(target, damage, engineContext, defender) {
		const before = defender.resources[target.key] || 0;
		const after = Math.max(0, before - damage);
		if (damage > 0) {
			defender.resources[target.key] = after;
			engineContext.services.handleResourceChange(
				engineContext,
				defender,
				target.key,
			);
		}
		return { before, after };
	},
	buildLog(target, damage, _engineContext, _defender, _meta, mutation) {
		return {
			type: 'resource',
			key: target.key,
			before: mutation.before,
			damage,
			after: mutation.after,
		};
	},
};

export default resourceHandler;
