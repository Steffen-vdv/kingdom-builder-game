import type { EffectHandler } from '.';
import type { StatKey } from '../state';
import { recordEffectStatDelta } from '../stat_sources';

export const statAddPct: EffectHandler = (effect, context, multiplier = 1) => {
	const key = effect.params!['key'] as StatKey;
	let percent = effect.params!['percent'] as number | undefined;
	if (percent === undefined) {
		const statKey = effect.params!['percentStat'] as StatKey;
		const statValue = context.activePlayer.stats[statKey] || 0;
		percent = statValue;
	}

	// Use a cache keyed by turn/phase/step so multiple evaluations in the
	// same step (e.g. multiple legions) scale additively from the
	// original stat value rather than compounding.
	const cacheKey =
		`${context.game.turn}:${context.game.currentPhase}:` +
		`${context.game.currentStep}:${key}`;
	if (!(cacheKey in context.statAddPctBases)) {
		context.statAddPctBases[cacheKey] = context.activePlayer.stats[key] || 0;
		context.statAddPctAccums[cacheKey] = 0;
	}

	const base = context.statAddPctBases[cacheKey]!;
	const before = context.activePlayer.stats[key] || 0;
	context.statAddPctAccums[cacheKey]! += base * percent * multiplier;
	let newValue = base + context.statAddPctAccums[cacheKey]!;
	if (effect.round === 'up') {
		newValue = newValue >= 0 ? Math.ceil(newValue) : Math.floor(newValue);
	} else if (effect.round === 'down') {
		newValue = newValue >= 0 ? Math.floor(newValue) : Math.ceil(newValue);
	} else if (effect.round === 'nearest') {
		newValue = Math.round(newValue);
	}
	if (newValue < 0) {
		newValue = 0;
	}
	context.activePlayer.stats[key] = newValue;
	if (newValue !== 0) {
		context.activePlayer.statsHistory[key] = true;
	}
	const delta = newValue - before;
	if (delta !== 0) {
		recordEffectStatDelta(effect, context, key, delta);
	}
};
