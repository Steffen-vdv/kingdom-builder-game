import { Land } from '../state';
import type { EffectHandler } from '.';

interface LandAddParams {
	count?: number;
	[key: string]: unknown;
}

export const landAdd: EffectHandler<LandAddParams> = (
	effect,
	engineContext,
	mult = 1,
) => {
	const count = Math.floor(Number(effect.params?.count ?? 1) * mult);
	for (let index = 0; index < count; index++) {
		const land = new Land(
			`${engineContext.activePlayer.id}-L${engineContext.activePlayer.lands.length + 1}`,
			engineContext.services.rules.slotsPerNewLand,
		);
		engineContext.activePlayer.lands.push(land);
	}
};
