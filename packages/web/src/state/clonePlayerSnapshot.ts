import type { PlayerSnapshot } from '../translation';

export function clonePlayerSnapshot(snapshot: PlayerSnapshot): PlayerSnapshot {
	return {
		resources: { ...snapshot.resources },
		stats: { ...snapshot.stats },
		population: { ...snapshot.population },
		valuesV2: { ...snapshot.valuesV2 },
		resourceBoundsV2: Object.fromEntries(
			Object.entries(snapshot.resourceBoundsV2).map(([resourceId, bounds]) => [
				resourceId,
				{
					lowerBound: bounds.lowerBound,
					upperBound: bounds.upperBound,
				},
			]),
		),
		buildings: [...snapshot.buildings],
		lands: snapshot.lands.map((land) => ({
			id: land.id,
			slotsMax: land.slotsMax,
			slotsUsed: land.slotsUsed,
			developments: [...land.developments],
		})),
		passives: snapshot.passives.map((entry) => ({ ...entry })),
	};
}
