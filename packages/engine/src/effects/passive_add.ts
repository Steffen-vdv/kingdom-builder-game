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
	} = params;
	if (!id) {
		throw new Error('passive:add requires id');
	}
	const passive: {
		id: string;
		name?: string | undefined;
		icon?: string | undefined;
		effects: EffectDef[];
		onGrowthPhase?: EffectDef[];
		onUpkeepPhase?: EffectDef[];
		onBeforeAttacked?: EffectDef[];
		onAttackResolved?: EffectDef[];
	} = {
		id,
		effects: effect.effects || [],
	};
	if (name !== undefined) {
		passive.name = name;
	}
	if (icon !== undefined) {
		passive.icon = icon;
	}
	if (onGrowthPhase) {
		passive.onGrowthPhase = onGrowthPhase;
	}
	if (onUpkeepPhase) {
		passive.onUpkeepPhase = onUpkeepPhase;
	}
	if (onBeforeAttacked) {
		passive.onBeforeAttacked = onBeforeAttacked;
	}
	if (onAttackResolved) {
		passive.onAttackResolved = onAttackResolved;
	}
	const options = {
		detail: params.detail,
		meta: params.meta,
	} as {
		detail?: string;
		meta?: PassiveMetadata;
	};
	for (let index = 0; index < Math.floor(mult); index++) {
		ctx.passives.addPassive(passive, ctx, options);
	}
};
