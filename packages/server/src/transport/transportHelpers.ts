import type {
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import type { SessionManager } from '../session/SessionManager.js';
import type { TransportHttpResponse } from './TransportTypes.js';

type StaticMetadata = ReturnType<SessionManager['getMetadata']>;

type MetadataKey = keyof StaticMetadata & keyof SessionSnapshotMetadata;

const STATIC_METADATA_KEYS: MetadataKey[] = [
	'resources',
	'populations',
	'buildings',
	'developments',
	'stats',
	'phases',
	'triggers',
	'assets',
];

export function mergeSnapshotMetadata(
	staticMetadata: StaticMetadata,
	dynamicMetadata: SessionSnapshot['metadata'],
): SessionSnapshotMetadata {
	const merged = structuredClone(dynamicMetadata);
	const base = structuredClone(staticMetadata);
	const applySection = <Key extends MetadataKey>(key: Key) => {
		const baseSection = base[key];
		if (!baseSection) {
			return;
		}
		const dynamicSection = merged[key];
		merged[key] = {
			...(baseSection as Record<string, unknown>),
			...(dynamicSection as Record<string, unknown> | undefined),
		} as SessionSnapshotMetadata[Key];
	};
	for (const key of STATIC_METADATA_KEYS) {
		applySection(key);
	}
	return merged;
}

export function attachHttpStatus<T extends object>(
	payload: T,
	status: number,
): TransportHttpResponse<T> {
	Object.defineProperty(payload, 'httpStatus', {
		value: status,
		enumerable: false,
	});
	return payload as TransportHttpResponse<T>;
}
