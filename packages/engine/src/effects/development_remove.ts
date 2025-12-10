import type { EffectHandler } from '.';

export const developmentRemove: EffectHandler = (
	effect,
	engineContext,
	mult = 1,
) => {
	const id = effect.params?.['id'] as string;
	const rawLandId = effect.params?.['landId'] as string;
	// Detect unresolved placeholders
	if (rawLandId?.startsWith('$')) {
		throw new Error(
			`development:remove received unresolved placeholder "${rawLandId}"`,
		);
	}
	const landId = rawLandId;
	if (!id || !landId) {
		throw new Error('development:remove requires id and landId');
	}
	const land = engineContext.activePlayer.lands.find(
		(landState) => landState.id === landId,
	);
	if (!land) {
		throw new Error(`Land ${landId} not found`);
	}
	const iterations = Math.floor(mult);
	for (let index = 0; index < iterations; index++) {
		const developmentIndex = land.developments.indexOf(id);
		if (developmentIndex === -1) {
			break;
		}
		land.developments.splice(developmentIndex, 1);
		land.slotsUsed = Math.max(0, land.slotsUsed - 1);
		engineContext.passives.removePassive(`${id}_${landId}`, engineContext);
	}
};
