import type { EffectDef } from './effects';

export function applyParamsToEffects<E extends EffectDef>(
	effects: E[],
	params: Record<string, unknown>,
): E[] {
	const replace = (val: unknown): unknown =>
		typeof val === 'string' && val.startsWith('$') ? params[val.slice(1)] : val;
	const replaceDeep = (val: unknown): unknown => {
		if (Array.isArray(val)) return val.map(replaceDeep);
		if (val && typeof val === 'object') {
			return Object.fromEntries(
				Object.entries(val).map(([key, value]) => [key, replaceDeep(value)]),
			);
		}
		return replace(val);
	};
	const mapEffect = (effect: E): E => ({
		...effect,
		params: effect.params
			? (Object.fromEntries(
					Object.entries(effect.params).map(([key, value]) => [
						key,
						replace(value),
					]),
				) as E['params'])
			: undefined,
		evaluator: effect.evaluator
			? {
					...effect.evaluator,
					params: effect.evaluator.params
						? Object.fromEntries(
								Object.entries(effect.evaluator.params).map(([key, value]) => [
									key,
									replace(value),
								]),
							)
						: undefined,
				}
			: undefined,
		effects: effect.effects
			? applyParamsToEffects(effect.effects, params)
			: undefined,
		meta: effect.meta
			? (replaceDeep(effect.meta) as Record<string, unknown>)
			: undefined,
	});
	return effects.map(mapEffect);
}

export function cloneEffectDef(effect: EffectDef): EffectDef {
	const cloned: EffectDef = { ...effect };
	if (effect.params) cloned.params = structuredClone(effect.params);
	if (effect.meta) cloned.meta = structuredClone(effect.meta);
	if (effect.evaluator) cloned.evaluator = structuredClone(effect.evaluator);
	if (effect.effects) cloned.effects = effect.effects.map(cloneEffectDef);
	return cloned;
}

export function cloneEffectList(
	effects?: EffectDef[],
): EffectDef[] | undefined {
	return effects ? effects.map((effect) => cloneEffectDef(effect)) : undefined;
}
