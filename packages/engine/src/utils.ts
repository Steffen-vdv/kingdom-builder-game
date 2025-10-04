import type { EffectDef } from './effects';

export function applyParamsToEffects<E extends EffectDef>(
	effects: E[],
	params: Record<string, unknown>,
): E[] {
	const replace = (val: unknown): unknown =>
		typeof val === 'string' && val.startsWith('$') ? params[val.slice(1)] : val;
	const replaceDeep = <T>(val: T): T => {
		if (Array.isArray(val)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return val.map((entry) => replaceDeep(entry)) as T;
		}
		if (val && typeof val === 'object') {
			return Object.fromEntries(
				Object.entries(val as Record<string, unknown>).map(([key, value]) => [
					key,
					replaceDeep(value),
				]),
			) as T;
		}
		return replace(val) as T;
	};
	const mapEffect = (effect: E): E => ({
		...effect,
		params: effect.params ? replaceDeep(effect.params) : undefined,
		evaluator: effect.evaluator
			? {
					...effect.evaluator,
					params: effect.evaluator.params
						? replaceDeep(effect.evaluator.params)
						: undefined,
				}
			: undefined,
		effects: effect.effects
			? applyParamsToEffects(effect.effects, params)
			: undefined,
		meta: effect.meta ? replaceDeep(effect.meta) : undefined,
	});
	return effects.map(mapEffect);
}

export function cloneEffectDef(effect: EffectDef): EffectDef {
	const cloned: EffectDef = { ...effect };
	if (effect.params) {
		cloned.params = structuredClone(effect.params);
	}
	if (effect.meta) {
		cloned.meta = structuredClone(effect.meta);
	}
	if (effect.evaluator) {
		cloned.evaluator = structuredClone(effect.evaluator);
	}
	if (effect.effects) {
		cloned.effects = effect.effects.map(cloneEffectDef);
	}
	return cloned;
}

export function cloneEffectList(
	effects?: EffectDef[],
): EffectDef[] | undefined {
	return effects ? effects.map((effect) => cloneEffectDef(effect)) : undefined;
}
