import type {
	AttackPlayerDiff,
	AttackResourceDiff,
	AttackStatDiff,
} from '@kingdom-builder/protocol';
import type { PlayerSnapshot } from '../../log';

function resolveOrderedResourceKeys(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): string[] {
	const candidates = before.orderedValueIds.length
		? before.orderedValueIds
		: after.orderedValueIds;
	if (candidates.length > 0) {
		return candidates.filter((id) => {
			return id in before.values || id in after.values;
		});
	}
	const keys = new Set(
		Object.keys({
			...before.resources,
			...after.resources,
		}),
	);
	return Array.from(keys);
}

function readResourceValue(snapshot: PlayerSnapshot, key: string): number {
	const entry = snapshot.values[key];
	if (entry) {
		return entry.value;
	}
	return snapshot.resources[key] ?? 0;
}

export function diffPlayerSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): AttackPlayerDiff[] {
	const diffs: AttackPlayerDiff[] = [];
	const orderedResourceKeys = resolveOrderedResourceKeys(before, after);
	for (const key of orderedResourceKeys) {
		const beforeValue = readResourceValue(before, key);
		const afterValue = readResourceValue(after, key);
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

	const statKeys = new Set(
		Object.keys({
			...before.stats,
			...after.stats,
		}),
	);
	for (const key of orderedResourceKeys) {
		statKeys.delete(key);
	}
	for (const key of statKeys) {
		const beforeValue = before.stats[key] ?? 0;
		const afterValue = after.stats[key] ?? 0;
		if (beforeValue !== afterValue) {
			const diff: AttackStatDiff = {
				type: 'stat',
				key,
				before: beforeValue,
				after: afterValue,
			};
			diffs.push(diff);
		}
	}

	return diffs;
}
