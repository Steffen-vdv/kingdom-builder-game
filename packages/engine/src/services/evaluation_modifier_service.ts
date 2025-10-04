import type { EngineContext } from '../context';
import type { EvaluationModifier, ResourceGain } from './passive_types';

export class EvaluationModifierService {
	modifiers: Map<string, Map<string, EvaluationModifier>> = new Map();
	index: Map<string, string> = new Map();

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
		const mods = this.modifiers.get(target);
		mods?.delete(id);
		if (mods && mods.size === 0) {
			this.modifiers.delete(target);
		}
		this.index.delete(id);
	}

	run(target: string, ctx: EngineContext, gains: ResourceGain[]) {
		const mods = this.modifiers.get(target);
		if (!mods) {
			return;
		}
		let globalPercent = 0;
		const perResourcePercent: Partial<Record<string, number>> = {};
		for (const modifier of mods.values()) {
			const result = modifier(ctx, gains);
			if (!result || result.percent === undefined) {
				continue;
			}
			const { percent } = result;
			if (typeof percent === 'number') {
				globalPercent += percent;
			} else {
				const entries = Object.entries(percent);
				for (const [key, value] of entries) {
					if (typeof value !== 'number') {
						continue;
					}
					const running = perResourcePercent[key] ?? 0;
					perResourcePercent[key] = running + value;
				}
			}
		}
		const hasMapEntries = Object.keys(perResourcePercent).length > 0;
		if (globalPercent === 0 && !hasMapEntries) {
			return;
		}
		for (const gain of gains) {
			const keyed = perResourcePercent[gain.key] ?? 0;
			const total = globalPercent + keyed;
			if (total === 0) {
				continue;
			}
			gain.amount += gain.amount * total;
		}
	}

	clone(): EvaluationModifierService {
		const cloned = new EvaluationModifierService();
		const entries = Array.from(this.modifiers.entries());
		cloned.modifiers = new Map(
			entries.map(([target, mods]) => [target, new Map(mods)]),
		);
		cloned.index = new Map(this.index);
		return cloned;
	}
}
