import type { EffectHandler } from '.';
import { runEffects } from '.';
import { applyParamsToEffects } from '../utils';
import { withStatSourceFrames } from '../stat_sources';
import type { PopulationRoleId } from '../state';

export const populationAdd: EffectHandler = (effect, ctx, mult = 1) => {
	const role = effect.params?.['role'] as PopulationRoleId;
	if (!role) {
		throw new Error('population:add requires role');
	}
	for (let i = 0; i < Math.floor(mult); i++) {
		const player = ctx.activePlayer;
		const def = ctx.populations.get(role);
		player.population[role] = (player.population[role] || 0) + 1;
		const index = player.population[role];
		if (def.onAssigned) {
			const effects = applyParamsToEffects(def.onAssigned, {
				index,
				player: player.id,
				role,
			});
			const frames = [
				() => ({
					kind: 'population',
					id: role,
					longevity: 'ongoing' as const,
					dependsOn: [
						{
							type: 'population',
							id: role,
							detail: 'assigned',
						},
					],
					removal: {
						type: 'population',
						id: role,
						detail: 'unassigned',
					},
				}),
			];
			withStatSourceFrames(ctx, frames, () => runEffects(effects, ctx));
		}
	}
};
