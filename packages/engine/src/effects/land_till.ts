import type { EffectHandler } from '.';

export const landTill: EffectHandler = (effect, engineContext, mult = 1) => {
	const max = engineContext.services.rules.maxSlotsPerLand;
	for (let index = 0; index < Math.floor(mult); index++) {
		const landId = effect.params?.['landId'] as string | undefined;
		const land = landId
			? engineContext.activePlayer.lands.find((l) => l.id === landId)
			: [...engineContext.activePlayer.lands]
					.reverse()
					.find((candidate) => !candidate.tilled && candidate.slotsMax < max);
		if (!land) {
			throw new Error('No tillable land available');
		}
		if (land.tilled) {
			throw new Error(`Land ${land.id} already tilled`);
		}
		land.slotsMax = Math.min(land.slotsMax + 1, max);
		land.tilled = true;
	}
};
