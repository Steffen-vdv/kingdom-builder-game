import type {
	ActionTrace as EngineActionTrace,
	PlayerSnapshot as EnginePlayerSnapshot,
	PassiveSummary as EnginePassiveSummary,
} from '@kingdom-builder/engine';
import type {
	ActionExecuteSuccessResponse,
	SessionPassiveSummary,
} from '@kingdom-builder/protocol';

export function normalizeActionTraces(
	traces: EngineActionTrace[],
): ActionExecuteSuccessResponse['traces'] {
	return traces.map((trace) => ({
		id: trace.id,
		before: normalizePlayerSnapshot(trace.before),
		after: normalizePlayerSnapshot(trace.after),
	}));
}

function normalizePlayerSnapshot(
	snapshot: EnginePlayerSnapshot,
): ActionExecuteSuccessResponse['traces'][number]['before'] {
	const normalizedValues: NonNullable<
		ActionExecuteSuccessResponse['traces'][number]['before']['values']
	> = {};
	for (const [valueId, value] of Object.entries(snapshot.values ?? {})) {
		const clone: (typeof normalizedValues)[string] = {
			kind: value.kind,
			value: value.value,
		};
		if (value.parentId !== undefined) {
			clone.parentId = value.parentId;
		}
		if (value.children !== undefined) {
			clone.children = [...value.children];
		}
		normalizedValues[valueId] = clone;
	}
	return {
		values: normalizedValues,
		orderedValueIds: [...(snapshot.orderedValueIds ?? [])],
		resources: { ...snapshot.resources },
		stats: { ...snapshot.stats },
		buildings: [...snapshot.buildings],
		lands: snapshot.lands.map((land) => ({
			id: land.id,
			slotsMax: land.slotsMax,
			slotsUsed: land.slotsUsed,
			developments: [...land.developments],
		})),
		passives: snapshot.passives.map((passive) => normalizePassive(passive)),
	};
}

function normalizePassive(
	passive: EnginePassiveSummary,
): SessionPassiveSummary {
	const normalized: SessionPassiveSummary = {
		id: passive.id,
	};
	if (passive.name !== undefined) {
		normalized.name = passive.name;
	}
	if (passive.icon !== undefined) {
		normalized.icon = passive.icon;
	}
	if (passive.detail !== undefined) {
		normalized.detail = passive.detail;
	}
	if (passive.meta !== undefined) {
		normalized.meta = structuredClone(passive.meta);
	}
	return normalized;
}
