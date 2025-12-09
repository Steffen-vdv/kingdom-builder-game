import type { EffectHandler, EffectDef } from '.';
import type {
	PassiveMetadata,
	PhaseSkipConfig,
} from '../services/passive_types';

interface PassiveParams {
	id: string;
	name?: string;
	icon?: string;
	detail?: string;
	meta?: PassiveMetadata;
	skip?: PhaseSkipConfig;
	onPayUpkeepStep?: EffectDef[];
	onGainIncomeStep?: EffectDef[];
	onGainAPStep?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
	[key: string]: unknown;
}

export const passiveAdd: EffectHandler<PassiveParams> = (
	effect,
	engineContext,
	mult = 1,
) => {
	const params = effect.params || ({} as PassiveParams);
	const {
		id,
		name,
		icon,
		detail,
		meta,
		skip,
		onPayUpkeepStep,
		onGainIncomeStep,
		onGainAPStep,
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
		detail?: string | undefined;
		meta?: PassiveMetadata | undefined;
		skip?: PhaseSkipConfig;
		effects: EffectDef[];
		onPayUpkeepStep?: EffectDef[];
		onGainIncomeStep?: EffectDef[];
		onGainAPStep?: EffectDef[];
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
	if (detail !== undefined) {
		passive.detail = detail;
	}
	if (meta !== undefined) {
		passive.meta = meta;
	}
	if (skip !== undefined) {
		passive.skip = skip;
	}
	if (onPayUpkeepStep) {
		passive.onPayUpkeepStep = onPayUpkeepStep;
	}
	if (onGainIncomeStep) {
		passive.onGainIncomeStep = onGainIncomeStep;
	}
	if (onGainAPStep) {
		passive.onGainAPStep = onGainAPStep;
	}
	if (onBeforeAttacked) {
		passive.onBeforeAttacked = onBeforeAttacked;
	}
	if (onAttackResolved) {
		passive.onAttackResolved = onAttackResolved;
	}
	for (let index = 0; index < Math.floor(mult); index++) {
		engineContext.passives.addPassive(passive, engineContext);
	}
};
