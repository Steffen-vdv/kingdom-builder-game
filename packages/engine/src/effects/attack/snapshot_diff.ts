import type {
	AttackPlayerDiff,
	AttackResourceDiff,
	AttackStatDiff,
} from '@kingdom-builder/protocol';
import type { PlayerSnapshot } from '../../log';
import type { ResourceKey, StatKey } from '../../state';

export function diffPlayerSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): AttackPlayerDiff[] {
	const diffs: AttackPlayerDiff[] = [];
	const resourceKeys = new Set(
		Object.keys({
			...before.resources,
			...after.resources,
		}),
	);
	for (const key of resourceKeys) {
		const typedKey: ResourceKey = key;
		const beforeValue = before.resources[typedKey] ?? 0;
		const afterValue = after.resources[typedKey] ?? 0;
		if (beforeValue !== afterValue) {
			const diff: AttackResourceDiff = {
				type: 'resource',
				key: typedKey,
				before: beforeValue,
				after: afterValue,
			};
			diffs.push(diff);
		}
	}

	const statKeys = new Set(
		Object.keys({
			...before.stats,
			...after.stats,
		}),
	);
	for (const key of statKeys) {
		const typedKey: StatKey = key;
		const beforeValue = before.stats[typedKey] ?? 0;
		const afterValue = after.stats[typedKey] ?? 0;
		if (beforeValue !== afterValue) {
			const diff: AttackStatDiff = {
				type: 'stat',
				key: typedKey,
				before: beforeValue,
				after: afterValue,
			};
			diffs.push(diff);
		}
	}

	return diffs;
}
