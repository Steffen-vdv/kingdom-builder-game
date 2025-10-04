import type { EngineContext } from '../context';
import type {
	EvaluationModifier,
	EvaluationModifierResult,
	ResourceGain,
	RoundingInstruction,
	RoundingMode,
} from './passive_types';

function applyRound(value: number, mode: RoundingMode | undefined) {
	if (!mode) {
		return value;
	}
	if (mode === 'up') {
		return value >= 0 ? Math.ceil(value) : Math.floor(value);
	}
	if (mode === 'down') {
		return value >= 0 ? Math.floor(value) : Math.ceil(value);
	}
	return value;
}

function mergeRoundInstruction(
	target: Partial<Record<string, RoundingMode>>,
	instruction: RoundingInstruction | undefined,
) {
	if (!instruction) {
		return;
	}
	if (typeof instruction === 'string') {
		target['*'] = instruction;
		return;
	}
	const entries = Object.entries(instruction);
	for (const [key, mode] of entries) {
		if (mode === 'up' || mode === 'down') {
			target[key] = mode;
		}
	}
}

function resolveRoundMode(
	map: Partial<Record<string, RoundingMode>>,
	key: string,
) {
	return map[key] ?? map['*'];
}

export class EvaluationModifierService {
	private modifiers: Map<string, Map<string, EvaluationModifier>> = new Map();
	private index: Map<string, string> = new Map();

	register(id: string, target: string, modifier: EvaluationModifier) {
		if (!this.modifiers.has(target)) {
			this.modifiers.set(target, new Map());
		}
		this.modifiers.get(target)!.set(id, modifier);
		this.index.set(id, target);
	}

	unregister(id: string) {
		const target = this.index.get(id);
		if (!target) {
			return;
		}
		const modifierMap = this.modifiers.get(target);
		modifierMap?.delete(id);
		if (modifierMap && modifierMap.size === 0) {
			this.modifiers.delete(target);
		}
		this.index.delete(id);
	}

	getMap(): ReadonlyMap<string, Map<string, EvaluationModifier>> {
		return this.modifiers;
	}

	run(target: string, context: EngineContext, gains: ResourceGain[]) {
		const modifierMap = this.modifiers.get(target);
		if (!modifierMap) {
			return;
		}
		let globalPercent = 0;
		const perResourcePercent: Partial<Record<string, number>> = {};
		const rounding: Partial<Record<string, RoundingMode>> = {};
		for (const modifier of modifierMap.values()) {
			const result = modifier(
				context,
				gains,
			) as EvaluationModifierResult | void;
			if (!result || result.percent === undefined) {
				if (result && 'round' in result) {
					mergeRoundInstruction(rounding, result.round);
				}
				continue;
			}
			const percent = result.percent;
			mergeRoundInstruction(rounding, result.round);
			if (typeof percent === 'number') {
				globalPercent += percent;
				continue;
			}
			const entries = Object.entries(percent);
			for (const [key, value] of entries) {
				if (typeof value !== 'number') {
					continue;
				}
				const currentPercent = perResourcePercent[key] ?? 0;
				perResourcePercent[key] = currentPercent + value;
			}
		}
		const hasGlobalPercent = globalPercent !== 0;
		const perResourceKeys = Object.keys(perResourcePercent);
		const hasPerResourcePercent = perResourceKeys.length > 0;
		if (!hasGlobalPercent && !hasPerResourcePercent) {
			return;
		}
		for (const gain of gains) {
			const keyedPercent = perResourcePercent[gain.key] ?? 0;
			const totalPercent = globalPercent + keyedPercent;
			if (totalPercent === 0) {
				continue;
			}
			const roundMode = resolveRoundMode(rounding, gain.key);
			const additionalGain = gain.amount * totalPercent;
			const adjusted = applyRound(additionalGain, roundMode);
			gain.amount += adjusted;
		}
	}

	clone(): EvaluationModifierService {
		const cloned = new EvaluationModifierService();
		const modifierEntries: Array<
			readonly [string, Map<string, EvaluationModifier>]
		> = [];
		for (const [target, modifierMap] of this.modifiers.entries()) {
			modifierEntries.push([target, new Map(modifierMap)]);
		}
		cloned.modifiers = new Map(modifierEntries);
		cloned.index = new Map(this.index);
		return cloned;
	}
}
