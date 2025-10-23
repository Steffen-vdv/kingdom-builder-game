import type {
	AttackPlayerDiff,
	AttackResourceDiff,
	AttackStatDiff,
} from '@kingdom-builder/protocol';
import type { PlayerSnapshot } from '../../log';

type SnapshotValueKind = 'resource' | 'group-parent' | 'stat';

function resolveSnapshotKind(
	snapshot: PlayerSnapshot,
	key: string,
): SnapshotValueKind | undefined {
	if (snapshot.valueKinds && key in snapshot.valueKinds) {
		return snapshot.valueKinds[key] as SnapshotValueKind;
	}
	if (key in snapshot.stats) {
		return 'stat';
	}
	if (key in snapshot.resources) {
		return 'resource';
	}
	return undefined;
}

function getSnapshotValue(snapshot: PlayerSnapshot, key: string): number {
	if (snapshot.values && key in snapshot.values) {
		return snapshot.values[key] ?? 0;
	}
	if (snapshot.resources && key in snapshot.resources) {
		return snapshot.resources[key] ?? 0;
	}
	if (snapshot.stats && key in snapshot.stats) {
		return snapshot.stats[key] ?? 0;
	}
	return 0;
}

function buildOrderedKeys(
	keys: Set<string>,
	snapshots: readonly PlayerSnapshot[],
): string[] {
	const seen = new Set<string>();
	const ordered: string[] = [];
	for (const snapshot of snapshots) {
		for (const key of snapshot.valueOrder ?? []) {
			if (!keys.has(key) || seen.has(key)) {
				continue;
			}
			ordered.push(key);
			seen.add(key);
		}
	}
	const remaining = Array.from(keys).filter((key) => !seen.has(key));
	remaining.sort();
	ordered.push(...remaining);
	return ordered;
}

export function diffPlayerSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): AttackPlayerDiff[] {
	const diffs: AttackPlayerDiff[] = [];
	const resourceKeys = new Set<string>();
	const statKeys = new Set<string>();

	const addKeysFromSnapshot = (snapshot: PlayerSnapshot) => {
		const valueEntries = Object.keys(snapshot.values ?? {});
		for (const key of valueEntries) {
			const kind = resolveSnapshotKind(snapshot, key);
			if (kind === 'stat') {
				statKeys.add(key);
			} else if (kind) {
				resourceKeys.add(key);
			}
		}
		for (const key of Object.keys(snapshot.resources ?? {})) {
			if (!statKeys.has(key)) {
				resourceKeys.add(key);
			}
		}
		for (const key of Object.keys(snapshot.stats ?? {})) {
			statKeys.add(key);
		}
	};

	addKeysFromSnapshot(before);
	addKeysFromSnapshot(after);

	const orderedResourceKeys = buildOrderedKeys(resourceKeys, [before, after]);
	const orderedStatKeys = buildOrderedKeys(statKeys, [before, after]);

	for (const key of orderedResourceKeys) {
		const beforeValue = getSnapshotValue(before, key);
		const afterValue = getSnapshotValue(after, key);
		if (beforeValue === afterValue) {
			continue;
		}
		const diff: AttackResourceDiff = {
			type: 'resource',
			key,
			before: beforeValue,
			after: afterValue,
		};
		diffs.push(diff);
	}

	for (const key of orderedStatKeys) {
		const beforeValue = getSnapshotValue(before, key);
		const afterValue = getSnapshotValue(after, key);
		if (beforeValue === afterValue) {
			continue;
		}
		const diff: AttackStatDiff = {
			type: 'stat',
			key,
			before: beforeValue,
			after: afterValue,
		};
		diffs.push(diff);
	}

	return diffs;
}
