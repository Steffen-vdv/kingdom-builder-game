import type { AttackPlayerDiff } from '@kingdom-builder/protocol';
import type { PlayerSnapshot } from '../../log';

export function diffPlayerSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): AttackPlayerDiff[] {
	const diffs: AttackPlayerDiff[] = [];
	const allKeys = new Set([
		...Object.keys(before.values),
		...Object.keys(after.values),
	]);

	for (const resourceId of allKeys) {
		const beforeValue = before.values[resourceId] ?? 0;
		const afterValue = after.values[resourceId] ?? 0;
		if (beforeValue !== afterValue) {
			diffs.push({ resourceId, before: beforeValue, after: afterValue });
		}
	}

	return diffs;
}
