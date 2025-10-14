import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { Registry } from '@kingdom-builder/protocol';
import {
	createRemoteSessionQueue,
	type RemoteSessionQueue,
	type RemoteSessionQueueState,
} from '../../src/state/RemoteSessionQueue';
import type { SessionQueueHelpers } from '../../src/state/sessionTypes';
import type { SessionRegistries } from '../../src/state/sessionRegistries';

interface TestSessionQueueOptions {
	sessionId?: string;
	snapshot: SessionSnapshot;
	registries: SessionRegistries;
	metadata?: SessionSnapshot['metadata'];
}

interface TestSessionQueueStateOptions {
	snapshot?: SessionSnapshot;
	registries?: SessionRegistries;
	metadata?: SessionSnapshot['metadata'];
}

export interface TestSessionQueueResult {
	queue: SessionQueueHelpers;
	remoteQueue: RemoteSessionQueue;
	sessionId: string;
	updateSnapshot(snapshot: SessionSnapshot): SessionSnapshot;
	updateState(state: TestSessionQueueStateOptions): RemoteSessionQueueState;
}

function cloneSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
	return structuredClone(snapshot);
}

function cloneRegistryEntries<T>(registry: Registry<T>): Registry<T> {
	const clone = new Registry<T>();
	for (const [id, definition] of registry.entries()) {
		clone.add(id, structuredClone(definition));
	}
	return clone;
}

function cloneRegistries(registries: SessionRegistries): SessionRegistries {
	return {
		actions: cloneRegistryEntries(registries.actions),
		buildings: cloneRegistryEntries(registries.buildings),
		developments: cloneRegistryEntries(registries.developments),
		populations: cloneRegistryEntries(registries.populations),
		resources: structuredClone(registries.resources),
	};
}

export function createTestSessionQueue({
	sessionId = 'test-session',
	snapshot,
	registries,
	metadata,
}: TestSessionQueueOptions): TestSessionQueueResult {
	const queueState: RemoteSessionQueueState = {
		snapshot: cloneSnapshot(snapshot),
		registries: cloneRegistries(registries),
		metadata: metadata ?? snapshot.metadata,
	};
	const remoteQueue = createRemoteSessionQueue({
		sessionId,
		...queueState,
	});
	const queue: SessionQueueHelpers = {
		enqueue: (task) => remoteQueue.enqueue(task),
		getLatestSnapshot: () => remoteQueue.getLatestSnapshot(),
		getLatestRegistries: () => remoteQueue.getLatestRegistries(),
		getLatestMetadata: () => remoteQueue.getLatestMetadata(),
		updatePlayerName: (playerId, playerName) => {
			const current = remoteQueue.getLatestSnapshot();
			if (!current) {
				return Promise.resolve();
			}
			const next: SessionSnapshot = {
				...current,
				game: {
					...current.game,
					players: current.game.players.map((player) => {
						if (player.id !== playerId) {
							return player;
						}
						return {
							...player,
							name: playerName,
						};
					}),
				},
			};
			remoteQueue.updateSnapshot(next);
			return Promise.resolve();
		},
	};
	return {
		queue,
		remoteQueue,
		sessionId,
		updateSnapshot: (nextSnapshot) => {
			return remoteQueue.updateSnapshot(cloneSnapshot(nextSnapshot));
		},
		updateState: ({
			snapshot: nextSnapshot,
			registries: nextRegistries,
			metadata: nextMetadata,
		}) => {
			const resolvedSnapshot =
				nextSnapshot ?? remoteQueue.getLatestSnapshot() ?? snapshot;
			const resolvedRegistries =
				nextRegistries ?? remoteQueue.getLatestRegistries() ?? registries;
			const resolvedMetadata =
				nextMetadata ??
				nextSnapshot?.metadata ??
				remoteQueue.getLatestMetadata() ??
				snapshot.metadata;
			return remoteQueue.updateState({
				snapshot: cloneSnapshot(resolvedSnapshot),
				registries: cloneRegistries(resolvedRegistries),
				metadata: resolvedMetadata,
			});
		},
	};
}
