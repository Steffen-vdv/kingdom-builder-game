import type {
	SessionSnapshot,
	SessionResourceBoundsV2,
} from '@kingdom-builder/protocol/session';

type ParticipantLand =
	SessionSnapshot['game']['players'][number]['lands'][number];

function cloneResourceBounds(
	bounds: Record<string, SessionResourceBoundsV2>,
): Record<string, SessionResourceBoundsV2> {
	return Object.fromEntries(
		Object.entries(bounds).map(([id, entry]) => [
			id,
			{
				lowerBound: entry.lowerBound ?? null,
				upperBound: entry.upperBound ?? null,
			},
		]),
	);
}

export interface TestParticipant {
	readonly id: string;
	readonly name: string;
	readonly resources: Record<string, number>;
	readonly population: Record<string, number>;
	readonly valuesV2: Record<string, number>;
	readonly resourceBoundsV2: Record<string, SessionResourceBoundsV2>;
	readonly lands: ParticipantLand[];
	readonly buildings: Set<string>;
	readonly actions: Set<string>;
}

interface ParticipantOptions {
	id: string;
	name: string;
	baseResources: Record<string, number>;
	initialPopulation: Record<string, number>;
	actionIds: string[];
	valuesV2: Record<string, number>;
	resourceBoundsV2: Record<string, SessionResourceBoundsV2>;
}

export function createParticipant({
	id,
	name,
	baseResources,
	initialPopulation,
	actionIds,
	valuesV2,
	resourceBoundsV2,
}: ParticipantOptions): TestParticipant {
	return {
		id,
		name,
		resources: { ...baseResources },
		population: { ...initialPopulation },
		valuesV2: { ...valuesV2 },
		resourceBoundsV2: cloneResourceBounds(resourceBoundsV2),
		lands: [],
		buildings: new Set<string>(),
		actions: new Set(actionIds),
	};
}

export function toPlayerSnapshot(
	participant: TestParticipant,
	capacityStat: string,
): SessionSnapshot['game']['players'][number] {
	return {
		id: participant.id,
		name: participant.name,
		resources: { ...participant.resources },
		valuesV2: { ...participant.valuesV2 },
		resourceBoundsV2: cloneResourceBounds(participant.resourceBoundsV2),
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
