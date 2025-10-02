import type { AttackTargetHandler, AttackTargetMutationResult } from './index';
import type { ResourceAttackTarget } from '../attack.types';

const resourceHandler: AttackTargetHandler<
	ResourceAttackTarget,
	AttackTargetMutationResult<'resource'>
> = {
	applyDamage(target, damage, _ctx, defender) {
		const before = defender.resources[target.key] || 0;
		const after = Math.max(0, before - damage);
		if (damage > 0) defender.resources[target.key] = after;
		return { before, after };
	},
	buildLog(target, damage, _ctx, _defender, _meta, mutation) {
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
