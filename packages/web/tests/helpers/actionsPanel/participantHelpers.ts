import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../../../src/state/sessionRegistries';

export interface ResourceSelectionContext {
	readonly registries: SessionRegistries;
	readonly usedResourceKeys: Set<string>;
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

interface ParticipantData {
	id: string;
	name: string;
	resources: Record<string, number>;
	population: Record<string, number>;
	lands: Array<{ slotsFree: number }>;
	buildings: Set<string>;
	actions: Set<string>;
}

export function createParticipant(
	id: string,
	name: string,
	baseResources: Record<string, number>,
	initialPopulation: Record<string, number>,
	actionIds: string[],
): ParticipantData {
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
	participant: ParticipantData,
	capacityStat: string,
): SessionSnapshot['game']['players'][number] {
	return {
		id: participant.id,
		name: participant.name,
		valuesV2: {
			...participant.resources,
			...participant.population,
			[capacityStat]: 3,
		},
		resourceTouchedV2: {},
		resourceBoundsV2: {},
		lands: participant.lands.map((land) => ({
			...land,
			slotsMax: land.slotsFree,
			slotsUsed: 0,
			tilled: false,
			developments: [],
		})),
		buildings: Array.from(participant.buildings),
		actions: Array.from(participant.actions),
		resourceSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
	};
}
