import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';

const assignIfDefined = <K extends keyof SessionSnapshotMetadata>(
	target: SessionSnapshotMetadata,
	key: K,
	value: SessionSnapshotMetadata[K] | undefined,
): void => {
	if (value !== undefined) {
		target[key] = value;
	}
};

export const mergeRegistryMetadata = (
	sessionMetadata: SessionSnapshotMetadata,
	fallback?: SessionSnapshotMetadata,
): SessionSnapshotMetadata => {
	const merged: SessionSnapshotMetadata = {
		passiveEvaluationModifiers:
			sessionMetadata.passiveEvaluationModifiers ??
			fallback?.passiveEvaluationModifiers ??
			{},
	};
	assignIfDefined(
		merged,
		'effectLogs',
		sessionMetadata.effectLogs ?? fallback?.effectLogs,
	);
	assignIfDefined(
		merged,
		'resources',
		sessionMetadata.resources ?? fallback?.resources,
	);
	assignIfDefined(
		merged,
		'populations',
		sessionMetadata.populations ?? fallback?.populations,
	);
	assignIfDefined(
		merged,
		'buildings',
		sessionMetadata.buildings ?? fallback?.buildings,
	);
	assignIfDefined(
		merged,
		'developments',
		sessionMetadata.developments ?? fallback?.developments,
	);
	assignIfDefined(merged, 'stats', sessionMetadata.stats ?? fallback?.stats);
	assignIfDefined(merged, 'phases', sessionMetadata.phases ?? fallback?.phases);
	assignIfDefined(
		merged,
		'triggers',
		sessionMetadata.triggers ?? fallback?.triggers,
	);
	assignIfDefined(merged, 'assets', sessionMetadata.assets ?? fallback?.assets);
	return merged;
};
