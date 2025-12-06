import type { EffectHandler } from '.';
import { runEffects } from '.';
import { applyParamsToEffects } from '@kingdom-builder/protocol';
import { withResourceSourceFrames } from '../resource_sources';
import type { PopulationRoleId } from '../state';
import { getResourceValue } from '../resource-v2';
import { setPopulationRoleValue } from './population_resource';

export const populationRemove: EffectHandler = (effect, context, mult = 1) => {
	const role = effect.params?.['role'] as PopulationRoleId;
	if (!role) {
		throw new Error('population:remove requires role');
	}
	const iterations = Math.floor(mult);
	let iterationIndex = 0;
	while (iterationIndex < iterations) {
		const player = context.activePlayer;
		// role IS the ResourceV2 ID (e.g. 'resource:population:role:council')
		const current = getResourceValue(player, role);
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
			withResourceSourceFrames(context, frames, () =>
				runEffects(effects, context),
			);
		}
		const { changed } = setPopulationRoleValue(context, role, current - 1);
		if (!changed) {
			return;
		}
		iterationIndex++;
	}
};
