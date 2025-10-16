import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol';

const mergeRecord = <Value>(
	baseRecord: Record<string, Value> | undefined,
	engineRecord: Record<string, Value> | undefined,
): Record<string, Value> => ({
	...(baseRecord ?? {}),
	...(engineRecord ?? {}),
});

export function mergeSessionSnapshotMetadata(
	baseMetadata: SessionSnapshotMetadata,
	engineMetadata: SessionSnapshotMetadata,
): SessionSnapshotMetadata {
	const engine = structuredClone(engineMetadata);
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {
			...baseMetadata.passiveEvaluationModifiers,
			...engine.passiveEvaluationModifiers,
		},
	};
	const effectLogs = engine.effectLogs ?? baseMetadata.effectLogs;
	if (effectLogs) {
		metadata.effectLogs = effectLogs;
	}
	const resources = mergeRecord(baseMetadata.resources, engine.resources);
	metadata.resources = resources;
	const populations = mergeRecord(baseMetadata.populations, engine.populations);
	metadata.populations = populations;
	const buildings = mergeRecord(baseMetadata.buildings, engine.buildings);
	metadata.buildings = buildings;
	const developments = mergeRecord(
		baseMetadata.developments,
		engine.developments,
	);
	metadata.developments = developments;
	const stats = mergeRecord(baseMetadata.stats, engine.stats);
	metadata.stats = stats;
	const phases = mergeRecord(baseMetadata.phases, engine.phases);
	metadata.phases = phases;
	const triggers = mergeRecord(baseMetadata.triggers, engine.triggers);
	metadata.triggers = triggers;
	const assets = mergeRecord(baseMetadata.assets, engine.assets);
	metadata.assets = assets;
	const overview = engine.overview ?? baseMetadata.overview;
	if (overview) {
		metadata.overview = overview;
	}
	return metadata;
}
