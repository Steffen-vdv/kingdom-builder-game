import type { EffectHandler } from '.';
import type { StatKey } from '../state';
import { recordEffectStatDelta } from '../stat_sources';

export const statAddPct: EffectHandler = (effect, context, multiplier = 1) => {
	const key = effect.params!['key'] as StatKey;
	const rawPercent = effect.params!['percent'] as number | undefined;
	let percent: number;
	if (rawPercent !== undefined) {
		percent = rawPercent;
	} else {
		const statKey = effect.params!['percentStat'] as StatKey | undefined;
		if (statKey) {
			// statKey is now a ResourceV2 ID - use resourceValues directly
			percent = context.activePlayer.resourceValues[statKey] || 0;
		} else {
			percent = 0;
		}
	}

	// Use a cache keyed by turn/phase/step so multiple evaluations in the
	// same step (e.g. multiple legions) scale additively from the
	// original stat value rather than compounding.
	const cacheKey =
		`${context.game.turn}:${context.game.currentPhase}:` +
		`${context.game.currentStep}:${key}`;
	if (!(cacheKey in context.statAddPctBases)) {
		// key is now a ResourceV2 ID - use resourceValues directly
		context.statAddPctBases[cacheKey] =
			context.activePlayer.resourceValues[key] || 0;
		context.statAddPctAccums[cacheKey] = 0;
	}

	const base = context.statAddPctBases[cacheKey]!;
	// key is now a ResourceV2 ID - use resourceValues directly
	const before = context.activePlayer.resourceValues[key] || 0;
	context.statAddPctAccums[cacheKey]! += base * percent * multiplier;
	let newValue = base + context.statAddPctAccums[cacheKey]!;
	if (effect.round === 'up') {
		newValue = newValue >= 0 ? Math.ceil(newValue) : Math.floor(newValue);
	} else if (effect.round === 'down') {
		newValue = newValue >= 0 ? Math.floor(newValue) : Math.ceil(newValue);
	}
	if (newValue < 0) {
		newValue = 0;
	}
	// key is now a ResourceV2 ID - use resourceValues directly
	context.activePlayer.resourceValues[key] = newValue;
	if (newValue !== 0) {
		context.activePlayer.statsHistory[key] = true;
	}
	const delta = newValue - before;
	if (delta !== 0) {
		recordEffectStatDelta(effect, context, key, delta);
	}
};
