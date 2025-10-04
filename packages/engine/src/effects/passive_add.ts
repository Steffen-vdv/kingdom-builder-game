import type { EffectHandler, EffectDef } from '.';
import type { PassiveMetadata } from '../services';

interface PassiveParams {
	id: string;
	name?: string;
	icon?: string;
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
	detail?: string;
	meta?: PassiveMetadata;
	[key: string]: unknown;
}

export const passiveAdd: EffectHandler<PassiveParams> = (
	effect,
	ctx,
	mult = 1,
) => {
	const params = effect.params || ({} as PassiveParams);
	const {
		id,
		name,
		icon,
		onGrowthPhase,
		onUpkeepPhase,
		onBeforeAttacked,
		onAttackResolved,
		detail,
		meta,
	} = params;
	if (!id) {
		throw new Error('passive:add requires id');
	}
	const passive: {
		id: string;
		name?: string;
		icon?: string;
		effects: EffectDef[];
		onGrowthPhase?: EffectDef[];
		onUpkeepPhase?: EffectDef[];
		onBeforeAttacked?: EffectDef[];
		onAttackResolved?: EffectDef[];
	} = {
		id,
		effects: effect.effects || [],
		...(name !== undefined ? { name } : {}),
		...(icon !== undefined ? { icon } : {}),
		...(onGrowthPhase ? { onGrowthPhase } : {}),
		...(onUpkeepPhase ? { onUpkeepPhase } : {}),
		...(onBeforeAttacked ? { onBeforeAttacked } : {}),
		...(onAttackResolved ? { onAttackResolved } : {}),
	};
	const options =
		detail === undefined && meta === undefined
			? undefined
			: {
					...(detail !== undefined ? { detail } : {}),
					...(meta !== undefined ? { meta } : {}),
				};
	for (let index = 0; index < Math.floor(mult); index++) {
		ctx.passives.addPassive(passive, ctx, options);
	}
};
