import type { EffectHandler } from '.';
import { runEffects } from '.';
import { applyParamsToEffects } from '@kingdom-builder/protocol';
import { withStatSourceFrames } from '../stat_sources';
import type { PopulationRoleId } from '../state';

export const populationAdd: EffectHandler = (effect, context, mult = 1) => {
	const role = effect.params?.['role'] as PopulationRoleId;
	if (!role) {
		throw new Error('population:add requires role');
	}
	const iterations = Math.floor(mult);
	let iterationIndex = 0;
	while (iterationIndex < iterations) {
		const player = context.activePlayer;
		const def = context.populations.get(role);
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
			withStatSourceFrames(context, frames, () => runEffects(effects, context));
		}
		iterationIndex++;
	}
};
