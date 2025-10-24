import type {
	SessionLandSnapshot,
	SessionPlayerStateSnapshot,
} from '@kingdom-builder/protocol/session';

export function cloneValue<T>(value: T): T {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneStatSources(
	statSources: SessionPlayerStateSnapshot['statSources'],
): SessionPlayerStateSnapshot['statSources'] {
	const cloneSources: SessionPlayerStateSnapshot['statSources'] = {};
	for (const [statId, contributions] of Object.entries(statSources)) {
		const clonedContributions: Record<
			string,
			{ amount: number; meta: unknown }
		> = {};
		for (const [sourceId, entry] of Object.entries(contributions)) {
			clonedContributions[sourceId] = {
				amount: entry.amount,
				meta: cloneValue(entry.meta),
			};
		}
		cloneSources[statId] = clonedContributions;
	}
	return cloneSources;
}

export function cloneSkipPhases(
	skipPhases: SessionPlayerStateSnapshot['skipPhases'],
): SessionPlayerStateSnapshot['skipPhases'] {
	const cloned: SessionPlayerStateSnapshot['skipPhases'] = {};
	for (const [phaseId, sources] of Object.entries(skipPhases)) {
		cloned[phaseId] = { ...sources };
	}
	return cloned;
}

export function cloneSkipSteps(
	skipSteps: SessionPlayerStateSnapshot['skipSteps'],
): SessionPlayerStateSnapshot['skipSteps'] {
	const cloned: SessionPlayerStateSnapshot['skipSteps'] = {};
	for (const [phaseId, stepMap] of Object.entries(skipSteps)) {
		const clonedStepMap: Record<string, Record<string, true>> = {};
		for (const [stepId, sources] of Object.entries(stepMap)) {
			clonedStepMap[stepId] = { ...sources };
		}
		cloned[phaseId] = clonedStepMap;
	}
	return cloned;
}

export function cloneLands(
	lands: SessionLandSnapshot[],
): SessionLandSnapshot[] {
	return lands.map((land) => ({
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
}

export function clonePassives(
	passives: SessionPlayerStateSnapshot['passives'],
): SessionPlayerStateSnapshot['passives'] {
	return passives.map((passive) => ({
		...passive,
		meta: passive.meta ? { ...passive.meta } : undefined,
	}));
}
