import type {
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionRegistriesMetadata,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from './sessionTypes';

export interface RemoteSessionQueueState {
	snapshot: SessionSnapshot;
	registries: SessionRegistries;
	metadata: SessionSnapshotMetadata;
	registriesMetadata?: SessionRegistriesMetadata;
}

export interface RemoteSessionQueueOptions extends RemoteSessionQueueState {
	sessionId: string;
}

export interface RemoteSessionQueue {
	readonly sessionId: string;
	enqueue<T>(task: () => Promise<T> | T): Promise<T>;
	getLatestSnapshot(): SessionSnapshot | null;
	getLatestRegistries(): SessionRegistries | null;
	getLatestMetadata(): SessionSnapshotMetadata | null;
	getLatestRegistriesMetadata(): SessionRegistriesMetadata | undefined;
	updateState(next: RemoteSessionQueueState): RemoteSessionQueueState;
	updateSnapshot(snapshot: SessionSnapshot): SessionSnapshot;
}

class RemoteSessionQueueImpl implements RemoteSessionQueue {
	readonly sessionId: string;
	#state: RemoteSessionQueueState;
	#chain: Promise<void>;

	constructor(options: RemoteSessionQueueOptions) {
		this.sessionId = options.sessionId;
		this.#state = createQueueState(options);
		this.#chain = Promise.resolve();
	}

	enqueue<T>(task: () => Promise<T> | T): Promise<T> {
		const next = this.#chain.then(() => Promise.resolve().then(task));
		this.#chain = next.catch(() => {}).then(() => undefined);
		return next;
	}

	getLatestSnapshot(): SessionSnapshot | null {
		return this.#state?.snapshot ?? null;
	}

	getLatestRegistries(): SessionRegistries | null {
		return this.#state?.registries ?? null;
	}

	getLatestMetadata(): SessionSnapshotMetadata | null {
		return this.#state?.metadata ?? null;
	}

	getLatestRegistriesMetadata(): SessionRegistriesMetadata | undefined {
		return this.#state?.registriesMetadata;
	}

	updateState(next: RemoteSessionQueueState): RemoteSessionQueueState {
		this.#state = createQueueState(next);
		return this.#state;
	}

	updateSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
		const nextState: RemoteSessionQueueState = {
			snapshot,
			registries: this.#state.registries,
			metadata: snapshot.metadata,
		};
		if (this.#state.registriesMetadata !== undefined) {
			nextState.registriesMetadata = this.#state.registriesMetadata;
		}
		this.#state = createQueueState(nextState);
		return this.#state.snapshot;
	}
}

export function createRemoteSessionQueue(
	options: RemoteSessionQueueOptions,
): RemoteSessionQueue {
	return new RemoteSessionQueueImpl(options);
}

export type { RemoteSessionQueueState as RemoteSessionQueueSnapshot };

function createQueueState(
	state: RemoteSessionQueueState,
): RemoteSessionQueueState {
	const nextState: RemoteSessionQueueState = {
		snapshot: state.snapshot,
		registries: state.registries,
		metadata: state.metadata,
	};
	if (state.registriesMetadata !== undefined) {
		nextState.registriesMetadata = state.registriesMetadata;
	}
	return nextState;
}
