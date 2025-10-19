import type { EngineSessionSnapshot } from '@kingdom-builder/engine';
import type { SessionRegistries } from '../../../src/state/sessionRegistries';

export interface ResourceSelectionContext {
	readonly registries: SessionRegistries;
	readonly usedResourceKeys: Set<string>;
}

export interface Participant {
	readonly id: string;
	readonly name: string;
	readonly resources: Record<string, number>;
	readonly population: Record<string, number>;
	readonly lands: Array<{ id: string; slotsFree: number }>;
	readonly buildings: Set<string>;
	readonly actions: Set<string>;
}

export function pickResourceKey(
	context: ResourceSelectionContext,
	requested: string | undefined,
	label: string,
): string {
	const { registries, usedResourceKeys } = context;
	if (requested && registries.resources[requested]) {
		usedResourceKeys.add(requested);
		return requested;
	}
	const available = Object.keys(registries.resources).find(
		(key) => !usedResourceKeys.has(key),
	);
	if (available) {
		usedResourceKeys.add(available);
		return available;
	}
	const fallback = requested ?? `${label}-${usedResourceKeys.size}`;
	if (!registries.resources[fallback]) {
		registries.resources[fallback] = { key: fallback };
	}
	usedResourceKeys.add(fallback);
	return fallback;
}

export function createParticipant(
	id: string,
	name: string,
	baseResources: Record<string, number>,
	initialPopulation: Record<string, number>,
	actionIds: string[],
): Participant {
	return {
		id,
		name,
		resources: { ...baseResources },
		population: { ...initialPopulation },
		lands: [],
		buildings: new Set<string>(),
		actions: new Set(actionIds),
	};
}

export function toPlayerSnapshot(
	participant: Participant,
	capacityStat: string,
): EngineSessionSnapshot['game']['players'][number] {
	return {
		id: participant.id,
		name: participant.name,
		resources: { ...participant.resources },
		stats: { [capacityStat]: 3 },
		statsHistory: {},
		population: { ...participant.population },
		lands: participant.lands.map((land) => ({
			...land,
			slotsMax: land.slotsFree,
			slotsUsed: 0,
			tilled: false,
			developments: [],
		})),
		buildings: Array.from(participant.buildings),
		actions: Array.from(participant.actions),
		statSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
	};
}
