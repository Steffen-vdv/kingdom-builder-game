import type { EffectHandler } from '.';
import { runEffects } from '.';
import { applyParamsToEffects } from '@kingdom-builder/protocol';
import { withStatSourceFrames } from '../stat_sources';
import type { PopulationRoleId } from '../state';
import { setPopulationRoleValue } from './population_resource';

export const populationAdd: EffectHandler = (effect, context, mult = 1) => {
	const role = effect.params?.['role'] as PopulationRoleId;
	if (!role) {
		throw new Error('population:add requires role');
	}
	const iterations = Math.floor(mult);
	let iterationIndex = 0;
	while (iterationIndex < iterations) {
		const player = context.activePlayer;
		const populationDefinition = context.populations.get(role);
		const current = player.population[role] ?? 0;
		const { changed, nextValue } = setPopulationRoleValue(
			context,
			role,
			current + 1,
		);
		if (!changed) {
			iterationIndex++;
			continue;
		}
		const index = nextValue;
		if (populationDefinition.onAssigned) {
			const effects = applyParamsToEffects(populationDefinition.onAssigned, {
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
