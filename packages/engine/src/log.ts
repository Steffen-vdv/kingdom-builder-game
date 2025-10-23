import type { EngineContext } from './context';
import type { PlayerState } from './state';
import type { PassiveSummary } from './services';
import type {
	ResourceV2Metadata,
	ResourceV2State,
	ResourceV2StateValueDefinition,
} from './resourceV2';

export interface PlayerSnapshotValue {
	kind: ResourceV2StateValueDefinition['kind'];
	value: number;
	parentId?: string;
	children?: readonly string[];
}

export interface PlayerSnapshot {
	values: Record<string, PlayerSnapshotValue>;
	orderedValueIds: readonly string[];
	resources: Record<string, number>;
	stats: Record<string, number>;
	buildings: string[];
	lands: {
		id: string;
		slotsMax: number;
		slotsUsed: number;
		developments: string[];
	}[];
	passives: PassiveSummary[];
}

export function snapshotPlayer(
	player: PlayerState,
	engineContext: EngineContext,
): PlayerSnapshot {
	const { values, orderedValueIds } = snapshotResourceValues(
		engineContext,
		player,
	);
	return {
		values,
		orderedValueIds,
		resources: { ...player.resources },
		stats: { ...player.stats },
		buildings: Array.from(player.buildings),
		lands: player.lands.map((land) => ({
			id: land.id,
			slotsMax: land.slotsMax,
			slotsUsed: land.slotsUsed,
			developments: [...land.developments],
		})),
		passives: engineContext.passives.list(player.id),
	};
}

export interface ActionTrace {
	id: string;
	before: PlayerSnapshot;
	after: PlayerSnapshot;
}

function snapshotResourceValues(
	engineContext: EngineContext,
	player: PlayerState,
): {
	values: Record<string, PlayerSnapshotValue>;
	orderedValueIds: readonly string[];
} {
	const metadata = engineContext.resourceV2Metadata;
	const state = engineContext.resourceV2States?.get(player.id);
	if (metadata && state) {
		return snapshotResourceV2Values(metadata, state);
	}
	const legacyValues: Record<string, PlayerSnapshotValue> = {};
	const ordered: string[] = [];
	for (const [key, amount] of Object.entries(player.resources)) {
		legacyValues[key] = { kind: 'resource', value: amount ?? 0 };
		ordered.push(key);
	}
	for (const [key, amount] of Object.entries(player.stats)) {
		if (legacyValues[key]) {
			continue;
		}
		legacyValues[key] = { kind: 'resource', value: amount ?? 0 };
		ordered.push(key);
	}
	return { values: legacyValues, orderedValueIds: ordered };
}

function snapshotResourceV2Values(
	metadata: ResourceV2Metadata,
	state: ResourceV2State,
): {
	values: Record<string, PlayerSnapshotValue>;
	orderedValueIds: readonly string[];
} {
	const values: Record<string, PlayerSnapshotValue> = {};
	for (const id of metadata.orderedValueIds) {
		const definition = metadata.values.get(id);
		if (!definition) {
			continue;
		}
		const node = state.values.get(id);
		const value = node?.value ?? 0;
		if (definition.kind === 'group-parent') {
			values[id] = {
				kind: definition.kind,
				value,
				children: definition.children,
			};
			continue;
		}
		const entry: PlayerSnapshotValue = {
			kind: definition.kind,
			value,
		};
		if (definition.parentId) {
			entry.parentId = definition.parentId;
		}
		values[id] = entry;
	}
	return { values, orderedValueIds: metadata.orderedValueIds };
}
