import type {
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import { cloneValue } from '../utils/structuredClone.js';

const METADATA_RECORD_KEYS = [
	'resources',
	'populations',
	'buildings',
	'developments',
	'stats',
	'phases',
	'triggers',
	'assets',
] as const;

type MetadataRecordKey = (typeof METADATA_RECORD_KEYS)[number];

type MetadataRecordValue = NonNullable<
	SessionSnapshotMetadata[MetadataRecordKey]
>;

export function mergeSnapshotWithMetadata(
	snapshot: SessionSnapshot,
	baseMetadata: SessionSnapshotMetadata,
): SessionSnapshot {
	return {
		...snapshot,
		metadata: mergeMetadata(baseMetadata, snapshot.metadata),
	};
}

export function mergeMetadata(
	base: SessionSnapshotMetadata,
	dynamic: SessionSnapshotMetadata,
): SessionSnapshotMetadata {
	const cloneBase = cloneValue(base);
	const cloneDynamic = cloneValue(dynamic);
	const baseRecords = cloneBase as Partial<
		Record<MetadataRecordKey, MetadataRecordValue>
	>;
	const dynamicRecords = cloneDynamic as Partial<
		Record<MetadataRecordKey, MetadataRecordValue>
	>;
	cloneBase.passiveEvaluationModifiers =
		cloneDynamic.passiveEvaluationModifiers;
	if (cloneDynamic.effectLogs !== undefined) {
		cloneBase.effectLogs = cloneDynamic.effectLogs;
	} else {
		delete cloneBase.effectLogs;
	}
	for (const key of METADATA_RECORD_KEYS) {
		const dynamicRecord = dynamicRecords[key];
		if (dynamicRecord === undefined) {
			continue;
		}
		const baseRecord = baseRecords[key];
		baseRecords[key] = baseRecord
			? { ...baseRecord, ...dynamicRecord }
			: dynamicRecord;
	}
	if (cloneDynamic.overview !== undefined) {
		cloneBase.overview = cloneDynamic.overview;
	}
	return cloneBase;
}
