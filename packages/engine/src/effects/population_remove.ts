import type { EffectHandler } from '.';
import { runEffects } from '.';
import { applyParamsToEffects } from '@kingdom-builder/protocol';
import { withStatSourceFrames } from '../stat_sources';
import type { PopulationRoleId } from '../state';

export const populationRemove: EffectHandler = (effect, context, mult = 1) => {
	const role = effect.params?.['role'] as PopulationRoleId;
	if (!role) {
		throw new Error('population:remove requires role');
	}
	const iterations = Math.floor(mult);
	let iterationIndex = 0;
	while (iterationIndex < iterations) {
		const player = context.activePlayer;
		const current = player.population[role] || 0;
		if (current <= 0) {
			return;
		}
		const roleDefinition = context.populations.get(role);
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
			withStatSourceFrames(context, frames, () => runEffects(effects, context));
		}
		player.population[role] = current - 1;
		iterationIndex++;
	}
};
