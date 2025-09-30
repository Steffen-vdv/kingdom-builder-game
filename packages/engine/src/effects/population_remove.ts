import type { EffectHandler } from '.';
import { runEffects } from '.';
import { applyParamsToEffects } from '../utils';
import { withStatSourceFrames } from '../stat_sources';
import type { PopulationRoleId } from '../state';

export const populationRemove: EffectHandler = (
	effect,
	engineContext,
	mult = 1,
) => {
	const role = effect.params?.['role'] as PopulationRoleId;
	if (!role) {
		throw new Error('population:remove requires role');
	}
	for (let i = 0; i < Math.floor(mult); i++) {
		const player = engineContext.activePlayer;
		const current = player.population[role] || 0;
		if (current <= 0) {
			return;
		}
		const roleDefinition = engineContext.populations.get(role);
		const index = current;
		if (roleDefinition.onUnassigned) {
			const effects = applyParamsToEffects(roleDefinition.onUnassigned, {
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
			withStatSourceFrames(engineContext, frames, () =>
				runEffects(effects, engineContext),
			);
		}
		player.population[role] = current - 1;
	}
};
