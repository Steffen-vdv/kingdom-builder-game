import type {
	SessionRegistriesPayload,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { deserializeSessionRegistries } from '../state/sessionRegistries';
import type { SessionRegistries } from '../state/sessionRegistries';
import snapshot from './defaultRegistryMetadata.json';

interface DefaultRegistrySnapshot {
	readonly registries: SessionRegistriesPayload;
	readonly metadata: SessionSnapshotMetadata;
}

function deepFreeze<T>(value: T): T {
	if (Array.isArray(value)) {
		for (const entry of value) {
			deepFreeze(entry);
		}
		return Object.freeze(value) as unknown as T;
	}
	if (value !== null && typeof value === 'object') {
		for (const entry of Object.values(value as Record<string, unknown>)) {
			deepFreeze(entry);
		}
		return Object.freeze(value);
	}
	return value;
}

function freezeRegistries(registries: SessionRegistries): SessionRegistries {
	deepFreeze(registries.resources);
	return Object.freeze(registries);
}

function assertDefaultRegistrySnapshot(
	value: unknown,
): asserts value is DefaultRegistrySnapshot {
	if (!value || typeof value !== 'object') {
		throw new Error('Invalid default registry snapshot payload.');
	}
	const record = value as Record<string, unknown>;
	if (typeof record.registries !== 'object' || record.registries === null) {
		throw new Error('Invalid registries payload in default snapshot.');
	}
	if (typeof record.metadata !== 'object' || record.metadata === null) {
		throw new Error('Invalid metadata payload in default snapshot.');
	}
	const metadataRecord = record.metadata as Record<string, unknown>;
	const requiredMaps = [
		'resources',
		'populations',
		'buildings',
		'developments',
		'stats',
		'phases',
		'triggers',
		'assets',
	];
	for (const key of requiredMaps) {
		const entry = metadataRecord[key];
		if (typeof entry !== 'object' || entry === null) {
			throw new Error(
				'Default snapshot metadata missing required "' +
					key +
					'" map.',
			);
		}
	}
        const overviewEntry = metadataRecord.overviewContent;
        if (typeof overviewEntry !== 'object' || overviewEntry === null) {
                throw new Error(
                        'Missing overviewContent in default registry snapshot metadata.',
                );
        }
}

const snapshotSource: unknown = snapshot;

assertDefaultRegistrySnapshot(snapshotSource);

const normalizedSnapshot = {
	registries: snapshotSource.registries,
        metadata: snapshotSource.metadata,
} satisfies DefaultRegistrySnapshot;

const SNAPSHOT = deepFreeze(structuredClone(normalizedSnapshot));

const DEFAULT_REGISTRIES_INTERNAL: SessionRegistries = freezeRegistries(
	deserializeSessionRegistries(SNAPSHOT.registries),
);

export const DEFAULT_REGISTRIES = DEFAULT_REGISTRIES_INTERNAL;

export const DEFAULT_REGISTRY_METADATA = SNAPSHOT.metadata;
