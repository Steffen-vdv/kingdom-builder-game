import { type EffectDef } from '@kingdom-builder/protocol';

type StringRecord = Record<string, string>;

export type StepEffects = { effects?: EffectDef[] } | undefined;

export interface StatPctBreakdown {
	role: string;
	percentStat: string;
}

function resolvePopulationRole(
	effect: EffectDef,
	currentRole: string | undefined,
): string | undefined {
	if (effect.evaluator?.type !== 'population') {
		return currentRole;
	}
	const params = effect.evaluator.params as StringRecord | undefined;
	return params?.['role'] ?? currentRole;
}

function detectPctEffect(
	effect: EffectDef,
	statKey: string,
	role: string | undefined,
): StatPctBreakdown | undefined {
	if (effect.type !== 'stat' || effect.method !== 'add_pct') {
		return undefined;
	}
	const params = effect.params as StringRecord | undefined;
	if (params?.['key'] !== statKey) {
		return undefined;
	}
	if (!params?.['percentStat'] || !role) {
		return undefined;
	}
	return { role, percentStat: params['percentStat'] };
}

export function findStatPctBreakdown(
	step: StepEffects,
	statKey: string,
): StatPctBreakdown | undefined {
	const walk = (
		effects: EffectDef[] | undefined,
		currentRole: string | undefined,
	): StatPctBreakdown | undefined => {
		if (!effects) {
			return undefined;
		}
		for (const effect of effects) {
			const role = resolvePopulationRole(effect, currentRole);
			const pct = detectPctEffect(effect, statKey, role);
			if (pct) {
				return pct;
			}
			const nested = walk(effect.effects, role);
			if (nested) {
				return nested;
			}
		}
		return undefined;
	};
	return walk(step?.effects, undefined);
}
