import { runEffects } from '..';
import type { AttackTargetHandler } from './index';
import type { BuildingAttackTarget } from '../attack.types';

const buildingHandler: AttackTargetHandler<
	BuildingAttackTarget,
	{ existed: boolean; destroyed: boolean }
> = {
	applyDamage(target, damage, ctx, defender, meta) {
		const existed = defender.buildings.has(target.id);
		let destroyed = false;

		if (damage > 0 && existed) {
			const { defenderIndex, originalIndex } = meta;
			ctx.game.currentPlayerIndex = defenderIndex;
			try {
				runEffects(
					[
						{
							type: 'building',
							method: 'remove',
							params: { id: target.id },
						},
					],
					ctx,
				);
			} finally {
				ctx.game.currentPlayerIndex = originalIndex;
			}
			destroyed = !defender.buildings.has(target.id);
		}

		return { existed, destroyed };
	},
	buildLog(target, damage, _ctx, _defender, _meta, mutation) {
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
