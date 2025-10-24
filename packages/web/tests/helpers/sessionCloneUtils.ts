import type { EffectDef } from '@kingdom-builder/protocol';
import type {
	SessionLandSnapshot,
	SessionPlayerStateSnapshot,
	SessionResourceBoundsV2,
} from '@kingdom-builder/protocol/session';

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

const cloneStatSources = (
	statSources: SessionPlayerStateSnapshot['statSources'],
): SessionPlayerStateSnapshot['statSources'] => {
	const cloneSources: SessionPlayerStateSnapshot['statSources'] = {};
	for (const [statId, contributions] of Object.entries(statSources)) {
		const clonedContributions: Record<
			string,
			{ amount: number; meta: unknown }
		> = {};
		for (const [sourceId, entry] of Object.entries(contributions)) {
			clonedContributions[sourceId] = {
				amount: entry.amount,
				meta: clone(entry.meta),
			};
		}
		cloneSources[statId] = clonedContributions;
	}
	return cloneSources;
};

const cloneSkipPhases = (
	skipPhases: SessionPlayerStateSnapshot['skipPhases'],
): SessionPlayerStateSnapshot['skipPhases'] => {
	const cloned: SessionPlayerStateSnapshot['skipPhases'] = {};
	for (const [phaseId, sources] of Object.entries(skipPhases)) {
		cloned[phaseId] = { ...sources };
	}
	return cloned;
};

const cloneSkipSteps = (
	skipSteps: SessionPlayerStateSnapshot['skipSteps'],
): SessionPlayerStateSnapshot['skipSteps'] => {
	const cloned: SessionPlayerStateSnapshot['skipSteps'] = {};
	for (const [phaseId, stepMap] of Object.entries(skipSteps)) {
		const clonedStepMap: Record<string, Record<string, true>> = {};
		for (const [stepId, sources] of Object.entries(stepMap)) {
			clonedStepMap[stepId] = { ...sources };
		}
		cloned[phaseId] = clonedStepMap;
	}
	return cloned;
};

const cloneResourceBoundsV2 = (
	resourceBounds: Record<string, SessionResourceBoundsV2>,
): Record<string, SessionResourceBoundsV2> => {
	const cloned: Record<string, SessionResourceBoundsV2> = {};
	for (const [resourceId, entry] of Object.entries(resourceBounds)) {
		const lowerBound =
			entry.lowerBound !== undefined && entry.lowerBound !== null
				? entry.lowerBound
				: null;
		const upperBound =
			entry.upperBound !== undefined && entry.upperBound !== null
				? entry.upperBound
				: null;
		cloned[resourceId] = { lowerBound, upperBound };
	}
	return cloned;
};

const cloneLands = (lands: SessionLandSnapshot[]): SessionLandSnapshot[] =>
	lands.map((land) => ({
		...land,
		developments: [...land.developments],
		upkeep: land.upkeep ? { ...land.upkeep } : undefined,
		onPayUpkeepStep: land.onPayUpkeepStep
			? land.onPayUpkeepStep.map((effect) => ({ ...effect }))
			: undefined,
		onGainIncomeStep: land.onGainIncomeStep
			? land.onGainIncomeStep.map((effect) => ({ ...effect }))
			: undefined,
		onGainAPStep: land.onGainAPStep
			? land.onGainAPStep.map((effect) => ({ ...effect }))
			: undefined,
	}));

const clonePassives = (
	passives: SessionPlayerStateSnapshot['passives'],
): SessionPlayerStateSnapshot['passives'] =>
	passives.map((passive) => ({
		...passive,
		meta: passive.meta ? { ...passive.meta } : undefined,
	}));

const cloneEffects = (
	effects: EffectDef[] | undefined,
): EffectDef[] | undefined =>
	effects ? effects.map((effect) => ({ ...effect })) : undefined;

export {
	clone,
	cloneEffects,
	cloneLands,
	clonePassives,
	cloneResourceBoundsV2,
	cloneSkipPhases,
	cloneSkipSteps,
	cloneStatSources,
};
