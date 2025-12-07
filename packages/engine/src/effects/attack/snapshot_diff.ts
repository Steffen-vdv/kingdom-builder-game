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

	for (const key of allKeys) {
		const beforeValue = before.values[key] ?? 0;
		const afterValue = after.values[key] ?? 0;
		if (beforeValue !== afterValue) {
			diffs.push({ key, before: beforeValue, after: afterValue });
		}
	}

	return diffs;
}
