import type { EffectDef } from '@kingdom-builder/protocol';
import { applyParamsToEffects } from '@kingdom-builder/protocol';
import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import { PhasedTranslator } from './phased';
import type { PhasedDef } from './phased';
import { withInstallation } from './decorators';
import type { TranslationContext } from '../context';
import { PHASES } from '@kingdom-builder/contents';

interface PhaseEffects {
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
	[key: string]: EffectDef[] | undefined;
}

function stripSelfEvaluators(
	effects: EffectDef[] | undefined,
	selfId: string | undefined,
): EffectDef[] | undefined {
	if (!effects?.length || !selfId) {
		return effects;
	}
	const result: EffectDef[] = [];
	for (const effect of effects) {
		const evaluator = effect.evaluator as
			| { type?: string; params?: Record<string, unknown> }
			| undefined;
		const evaluatorId = evaluator?.params?.['id'];
		if (evaluator?.type === 'development' && evaluatorId === selfId) {
			const nested = stripSelfEvaluators(effect.effects, selfId);
			if (nested?.length) {
				result.push(...nested);
			}
			continue;
		}
		const next: EffectDef = { ...effect };
		if (effect.effects) {
			next.effects = stripSelfEvaluators(effect.effects, selfId);
		}
		result.push(next);
	}
	return result;
}

function gatherEffects(
	effects: EffectDef[] | undefined,
	id: string,
	out: EffectDef[],
): void {
	if (!effects) {
		return;
	}
	for (const effect of effects) {
		if (
			effect.evaluator?.type === 'development' &&
			(effect.evaluator.params as Record<string, string> | undefined)?.[
				'id'
			] === id
		) {
			out.push(effect);
		}
		if (effect.effects) {
			gatherEffects(effect.effects, id, out);
		}
	}
}

function applySelfParams(
	definition: PhasedDef,
	params: Record<string, unknown>,
): PhasedDef {
	const mapped: PhasedDef = {};
	const rawId = params['id'];
	const selfId = typeof rawId === 'string' ? rawId : undefined;
	for (const key of Object.keys(definition) as (keyof PhasedDef)[]) {
		const value = definition[key];
		if (!Array.isArray(value)) {
			continue;
		}
		const applied = applyParamsToEffects(value, params);
		mapped[key] = stripSelfEvaluators(applied, selfId) ?? applied;
	}
	return mapped;
}

function collectPhaseEffects(
	id: string,
	params: Record<string, unknown>,
): PhaseEffects {
	const result: PhaseEffects = {};
	const rawId = params['id'];
	const selfId = typeof rawId === 'string' ? rawId : undefined;
	for (const phase of PHASES) {
		const phaseHandlerKey = `on${
			phase.id.charAt(0).toUpperCase() + phase.id.slice(1)
		}Phase`;
		const key = phaseHandlerKey as keyof PhaseEffects;
		for (const step of phase.steps ?? []) {
			const bucket: EffectDef[] = [];
			gatherEffects(step.effects, id, bucket);
			if (bucket.length) {
				const applied = applyParamsToEffects(bucket, params);
				const additions = stripSelfEvaluators(applied, selfId) ?? applied;
				if (additions.length) {
					result[key] = [...(result[key] ?? []), ...additions];
				}
			}
		}
	}
	return result;
}

class DevelopmentCore implements ContentTranslator<string> {
	private phased = new PhasedTranslator();
	summarize(id: string, engineContext: TranslationContext): Summary {
		const definition = engineContext.developments.get(id);
		if (!definition) {
			return [];
		}
		const params = { id };
		const base = applySelfParams(definition as unknown as PhasedDef, params);
		const merged: PhasedDef = { ...base };
		const phases = collectPhaseEffects(id, params);
		for (const [key, effects] of Object.entries(phases)) {
			if (!effects?.length) {
				continue;
			}
			const current = merged[key as keyof PhasedDef] ?? [];
			merged[key as keyof PhasedDef] = [...current, ...effects];
		}
		return this.phased.summarize(merged, engineContext);
	}
	describe(id: string, engineContext: TranslationContext): Summary {
		const definition = engineContext.developments.get(id);
		if (!definition) {
			return [];
		}
		const params = { id };
		const base = applySelfParams(definition as unknown as PhasedDef, params);
		const merged: PhasedDef = { ...base };
		const phases = collectPhaseEffects(id, params);
		for (const [key, effects] of Object.entries(phases)) {
			if (!effects?.length) {
				continue;
			}
			const current = merged[key as keyof PhasedDef] ?? [];
			merged[key as keyof PhasedDef] = [...current, ...effects];
		}
		return this.phased.describe(merged, engineContext);
	}
	log(id: string, engineContext: TranslationContext): string[] {
		const definition = engineContext.developments.get(id);
		const name = definition?.name ?? id;
		const icon = definition?.icon ?? '';
		const display = [icon, name].filter(Boolean).join(' ').trim();
		return [display || name];
	}
}

registerContentTranslator(
	'development',
	withInstallation(new DevelopmentCore()),
);
