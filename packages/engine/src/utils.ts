import type { EffectDef } from './effects';

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
