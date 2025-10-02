import type { AttackTargetHandler } from './index';
import type { StatAttackTarget } from '../attack.types';

const statHandler: AttackTargetHandler<
	StatAttackTarget,
	{ before: number; after: number }
> = {
	applyDamage(target, damage, _ctx, defender) {
		const before = defender.stats[target.key] || 0;
		const after = Math.max(0, before - damage);
		if (damage > 0) defender.stats[target.key] = after;
		return { before, after };
	},
	buildLog(target, damage, _ctx, _defender, _meta, mutation) {
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
