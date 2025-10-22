import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { SessionActionMetadataSnapshot } from './sessionTypes';
import type { SessionPlayerId } from '@kingdom-builder/protocol/session';
import { createMetadataKey } from './actionMetadataKey';

type MetadataListener = (snapshot: SessionActionMetadataSnapshot) => void;

interface ActionMetadataSubscriptionsOptions {
	readMetadata: (
		actionId: string,
		params: ActionParametersPayload | undefined,
		playerId: SessionPlayerId | undefined,
	) => SessionActionMetadataSnapshot;
}

export class ActionMetadataSubscriptions {
	#listeners: Map<string, Set<MetadataListener>>;
	#params: Map<
		string,
		{
			actionId: string;
			params: ActionParametersPayload | undefined;
			playerId: SessionPlayerId | undefined;
		}
	>;
	#readMetadata: ActionMetadataSubscriptionsOptions['readMetadata'];

	constructor(options: ActionMetadataSubscriptionsOptions) {
		this.#listeners = new Map();
		this.#params = new Map();
		this.#readMetadata = options.readMetadata;
	}

	subscribe(
		actionId: string,
		params: ActionParametersPayload | undefined,
		playerId: SessionPlayerId | undefined,
		listener: MetadataListener,
	): () => void {
		const key = createMetadataKey(actionId, params, playerId);
		let listeners = this.#listeners.get(key);
		if (!listeners) {
			listeners = new Set();
			this.#listeners.set(key, listeners);
			this.#params.set(key, { actionId, params, playerId });
		}
		listeners.add(listener);
		listener(this.#readMetadata(actionId, params, playerId));
		return () => {
			const current = this.#listeners.get(key);
			if (!current) {
				return;
			}
			current.delete(listener);
			if (current.size === 0) {
				this.#listeners.delete(key);
				this.#params.delete(key);
			}
		};
	}

	emitForKey(key: string): void {
		const listeners = this.#listeners.get(key);
		if (!listeners || listeners.size === 0) {
			return;
		}
		const params = this.#params.get(key);
		if (!params) {
			return;
		}
		const snapshot = this.#readMetadata(
			params.actionId,
			params.params,
			params.playerId,
		);
		for (const listener of listeners) {
			listener(snapshot);
		}
	}

	emitAll(actionId: string): void {
		for (const [key, params] of this.#params.entries()) {
			if (params.actionId === actionId) {
				this.emitForKey(key);
			}
		}
	}
}
