import { runEffects } from '..';
import type { AttackTargetHandler, AttackTargetMutationResult } from './index';
import type { BuildingAttackTarget } from '../attack.types';

const buildingHandler: AttackTargetHandler<
	BuildingAttackTarget,
	AttackTargetMutationResult<'building'>
> = {
	getEvaluationModifierKey(target) {
		return target.id;
	},
	applyDamage(target, damage, engineContext, defender, meta) {
		const existed = defender.buildings.has(target.id);
		let destroyed = false;

		if (damage > 0 && existed) {
			const { defenderIndex, originalIndex } = meta;
			engineContext.game.currentPlayerIndex = defenderIndex;
			try {
				runEffects(
					[
						{
							type: 'building',
							method: 'remove',
							params: { id: target.id },
						},
					],
					engineContext,
				);
			} finally {
				engineContext.game.currentPlayerIndex = originalIndex;
			}
			destroyed = !defender.buildings.has(target.id);
		}

		return { existed, destroyed };
	},
	buildLog(target, damage, _engineContext, _defender, _meta, mutation) {
		return {
			type: 'building',
			id: target.id,
			existed: mutation.existed,
			destroyed: mutation.destroyed,
			damage,
		};
	},
};

export default buildingHandler;
