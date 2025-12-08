import type { ResourceAttackTarget } from '@kingdom-builder/protocol';
import type { AttackTargetHandler, AttackTargetMutationResult } from './index';

const resourceHandler: AttackTargetHandler<
	ResourceAttackTarget,
	AttackTargetMutationResult<'resource'>
> = {
	getEvaluationModifierKey(target) {
		return target.resourceId;
	},
	applyDamage(target, damage, engineContext, defender) {
		// target.resourceId is now a Resource ID - use resourceValues directly
		const before = defender.resourceValues[target.resourceId] || 0;
		const after = Math.max(0, before - damage);
		if (damage > 0) {
			defender.resourceValues[target.resourceId] = after;
			engineContext.services.handleResourceChange(
				engineContext,
				defender,
				target.resourceId,
			);
		}
		return { before, after };
	},
	buildLog(target, damage, _engineContext, _defender, _meta, mutation) {
		return {
			type: 'resource',
			resourceId: target.resourceId,
			before: mutation.before,
			damage,
			after: mutation.after,
		};
	},
};

export default resourceHandler;
