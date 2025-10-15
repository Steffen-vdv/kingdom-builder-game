import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol';

function deepMergeValues(baseValue: unknown, overlayValue: unknown): unknown {
	if (overlayValue === undefined) {
		if (baseValue === undefined) {
			return undefined;
		}
		return structuredClone(baseValue);
	}
	if (overlayValue === null || typeof overlayValue !== 'object') {
		return structuredClone(overlayValue);
	}
	if (Array.isArray(overlayValue)) {
		return structuredClone(overlayValue);
	}
	const baseRecord =
		baseValue !== null &&
		typeof baseValue === 'object' &&
		!Array.isArray(baseValue)
			? (baseValue as Record<string, unknown>)
			: {};
	const overlayRecord = overlayValue as Record<string, unknown>;
	const result: Record<string, unknown> = {};
	for (const [key, baseChild] of Object.entries(baseRecord)) {
		result[key] = structuredClone(baseChild);
	}
	for (const [key, overlayChild] of Object.entries(overlayRecord)) {
		result[key] = deepMergeValues(baseRecord[key], overlayChild);
	}
	return result;
}

export function mergeSessionMetadata(
	base: SessionSnapshotMetadata,
	overlay: SessionSnapshotMetadata | undefined,
): SessionSnapshotMetadata {
	if (!overlay) {
		return base;
	}
	return deepMergeValues(base, overlay) as SessionSnapshotMetadata;
}
