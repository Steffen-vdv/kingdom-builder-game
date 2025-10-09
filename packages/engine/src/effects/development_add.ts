import type { EffectHandler } from '.';
import { applyParamsToEffects } from '../utils';

export const developmentAdd: EffectHandler = (
	effect,
	engineContext,
	mult = 1,
) => {
	const id =
		(effect.params?.['id'] as string | undefined) ||
		(effect.params?.['developmentId'] as string | undefined);
	const providedLandId = effect.params?.['landId'] as string | undefined;
	if (!id) {
		throw new Error('development:add requires id');
	}
	const land =
		(providedLandId
			? engineContext.activePlayer.lands.find(
					(landItem) => landItem.id === providedLandId,
				)
			: [...engineContext.activePlayer.lands]
					.reverse()
					.find((candidate) => candidate.slotsUsed < candidate.slotsMax)) ||
		null;
	if (!land) {
		if (providedLandId) {
			throw new Error(`Land ${providedLandId} not found`);
		}
		throw new Error('No land with an open development slot');
	}
	const landId = land.id;
	const iterations = Math.floor(mult);
	for (let index = 0; index < iterations; index++) {
		if (land.slotsUsed >= land.slotsMax) {
			throw new Error(`No free slots on land ${landId}`);
		}
		land.developments.push(id);
		land.slotsUsed += 1;
		const developmentDefinition = engineContext.developments.get(id);
		if (developmentDefinition?.onBuild) {
			const onBuildEffects = applyParamsToEffects(
				developmentDefinition.onBuild,
				{ landId, id },
			);
			engineContext.passives.addPassive(
				{ id: `${id}_${landId}`, effects: onBuildEffects },
				engineContext,
				{
					frames: () => ({
						kind: 'development',
						id,
						longevity: 'ongoing' as const,
						dependsOn: [{ type: 'development', id }],
						removal: { type: 'development', id, detail: 'removed' },
					}),
				},
			);
		}
	}
};
