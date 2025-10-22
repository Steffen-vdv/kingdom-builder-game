import type { EngineContext } from '../context';
import type {
	CostBag,
	CostModifier,
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
	if (mode === 'nearest') {
		return Math.round(value);
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
		if (mode === 'up' || mode === 'down' || mode === 'nearest') {
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

export class CostModifierService {
	private modifiers: Map<string, CostModifier> = new Map();

	register(id: string, modifier: CostModifier) {
		this.modifiers.set(id, modifier);
	}

	unregister(id: string) {
		this.modifiers.delete(id);
	}

	apply(actionId: string, base: CostBag, context: EngineContext): CostBag {
		const running: CostBag = { ...base };
		const percentTotals: Partial<Record<string, number>> = {};
		const percentRounds: Partial<Record<string, RoundingMode>> = {};
		for (const modifier of this.modifiers.values()) {
			const result = modifier(actionId, running, context);
			if (!result) {
				continue;
			}
			if (result.flat) {
				for (const [key, delta] of Object.entries(result.flat)) {
					if (typeof delta !== 'number') {
						continue;
					}
					const current = running[key] ?? 0;
					running[key] = current + delta;
				}
			}
			if (result.percent) {
				for (const [key, percent] of Object.entries(result.percent)) {
					if (typeof percent !== 'number') {
						continue;
					}
					percentTotals[key] = (percentTotals[key] ?? 0) + percent;
				}
				mergeRoundInstruction(percentRounds, result.round);
			}
		}
		for (const [key, percent] of Object.entries(percentTotals)) {
			if (typeof percent !== 'number') {
				continue;
			}
			const current = running[key] ?? 0;
			const roundMode = resolveRoundMode(percentRounds, key);
			const delta = current * percent;
			const adjusted = applyRound(delta, roundMode);
			running[key] = current + adjusted;
		}
		return running;
	}

	clone(): CostModifierService {
		const cloned = new CostModifierService();
		cloned.modifiers = new Map(this.modifiers);
		return cloned;
	}
}
