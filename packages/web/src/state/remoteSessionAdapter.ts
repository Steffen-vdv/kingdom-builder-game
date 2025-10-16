import type {
	SessionActionCostMap,
	SessionActionDefinitionSummary,
	SessionActionRequirementList,
	SessionAdvanceResult,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateResponse,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { GameApi, GameApiRequestOptions } from '../services/gameApi';
import {
	assertSessionRecord,
	enqueueSessionTask,
	getSessionRecord,
} from './sessionStateStore';
import type {
	LegacySession,
	SessionActionMetadataSnapshot,
} from './sessionTypes';
import { createMetadataKey } from './actionMetadataKey';

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

interface RemoteSessionAdapterDependencies {
	ensureGameApi: () => GameApi;
	runAiTurn: (
		request: SessionRunAiRequest,
		options?: GameApiRequestOptions,
	) => Promise<SessionRunAiResponse>;
}

export class RemoteSessionAdapter implements LegacySession {
	#sessionId: string;
	#deps: RemoteSessionAdapterDependencies;
	#latestAdvance: SessionAdvanceResult | null = null;
	#simulationCache: Map<string, SessionSimulateResponse['result']>;
	#actionCostCache: Map<string, SessionActionCostMap>;
	#actionRequirementCache: Map<string, SessionActionRequirementList>;
	#actionOptionCache: Map<string, ActionEffectGroup[]>;
	#metadataSubscribers: Map<
		string,
		Set<(snapshot: SessionActionMetadataSnapshot) => void>
	>;
	#metadataParams: Map<
		string,
		{ actionId: string; params: ActionParametersPayload | undefined }
	>;

	constructor(
		sessionId: string,
		dependencies: RemoteSessionAdapterDependencies,
	) {
		this.#sessionId = sessionId;
		this.#deps = dependencies;
		this.#simulationCache = new Map();
		this.#actionCostCache = new Map();
		this.#actionRequirementCache = new Map();
		this.#actionOptionCache = new Map();
		this.#metadataSubscribers = new Map();
		this.#metadataParams = new Map();
	}

	enqueue<T>(task: () => Promise<T> | T): Promise<T> {
		return enqueueSessionTask(this.#sessionId, task);
	}

	getSnapshot(): SessionSnapshot {
		const record = assertSessionRecord(this.#sessionId);
		return record.snapshot;
	}

	#emitMetadataForKey(key: string): void {
		const listeners = this.#metadataSubscribers.get(key);
		if (!listeners || listeners.size === 0) {
			return;
		}
		const params = this.#metadataParams.get(key);
		if (!params) {
			return;
		}
		const snapshot = this.readActionMetadata(params.actionId, params.params);
		for (const listener of listeners) {
			listener(snapshot);
		}
	}

	#emitAllMetadata(actionId: string): void {
		for (const [key, params] of this.#metadataParams.entries()) {
			if (params.actionId === actionId) {
				this.#emitMetadataForKey(key);
			}
		}
	}

	#cacheActionCosts(key: string, costs: SessionActionCostMap): void {
		this.#actionCostCache.set(key, clone(costs));
	}

	#cacheActionRequirements(
		key: string,
		requirements: SessionActionRequirementList,
	): void {
		this.#actionRequirementCache.set(key, clone(requirements));
	}

	#cacheActionOptions(key: string, groups: ActionEffectGroup[]): void {
		this.#actionOptionCache.set(key, clone(groups));
	}

	getActionCosts(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionCostMap {
		const key = createMetadataKey(actionId, params);
		const cached = this.#actionCostCache.get(key);
		return cached ? clone(cached) : {};
	}

	getActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionRequirementList {
		const key = createMetadataKey(actionId, params);
		const cached = this.#actionRequirementCache.get(key);
		return cached ? clone(cached) : [];
	}

	getActionOptions(actionId: string): ActionEffectGroup[] {
		const key = createMetadataKey(actionId, undefined);
		const cached = this.#actionOptionCache.get(key);
		return cached ? clone(cached) : [];
	}

	readActionMetadata(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionMetadataSnapshot {
		const key = createMetadataKey(actionId, params);
		const snapshot: SessionActionMetadataSnapshot = {};
		const cachedCosts = this.#actionCostCache.get(key);
		if (cachedCosts) {
			snapshot.costs = clone(cachedCosts);
		}
		const cachedRequirements = this.#actionRequirementCache.get(key);
		if (cachedRequirements) {
			snapshot.requirements = clone(cachedRequirements);
		}
		const optionKey = createMetadataKey(actionId, undefined);
		const cachedGroups = this.#actionOptionCache.get(optionKey);
		if (cachedGroups) {
			snapshot.groups = clone(cachedGroups);
		}
		return snapshot;
	}

	subscribeActionMetadata(
		actionId: string,
		params: ActionParametersPayload | undefined,
		listener: (snapshot: SessionActionMetadataSnapshot) => void,
	): () => void {
		const key = createMetadataKey(actionId, params);
		let listeners = this.#metadataSubscribers.get(key);
		if (!listeners) {
			listeners = new Set();
			this.#metadataSubscribers.set(key, listeners);
			this.#metadataParams.set(key, { actionId, params });
		}
		listeners.add(listener);
		listener(this.readActionMetadata(actionId, params));
		return () => {
			const current = this.#metadataSubscribers.get(key);
			if (!current) {
				return;
			}
			current.delete(listener);
			if (current.size === 0) {
				this.#metadataSubscribers.delete(key);
				this.#metadataParams.delete(key);
			}
		};
	}

	setActionCosts(
		actionId: string,
		costs: SessionActionCostMap,
		params?: ActionParametersPayload,
	): void {
		const key = createMetadataKey(actionId, params);
		this.#cacheActionCosts(key, costs);
		this.#emitMetadataForKey(key);
	}

	setActionRequirements(
		actionId: string,
		requirements: SessionActionRequirementList,
		params?: ActionParametersPayload,
	): void {
		const key = createMetadataKey(actionId, params);
		this.#cacheActionRequirements(key, requirements);
		this.#emitMetadataForKey(key);
	}

	setActionOptions(actionId: string, groups: ActionEffectGroup[]): void {
		const key = createMetadataKey(actionId, undefined);
		this.#cacheActionOptions(key, groups);
		this.#emitAllMetadata(actionId);
	}

	getActionDefinition(
		actionId: string,
	): SessionActionDefinitionSummary | undefined {
		const record = getSessionRecord(this.#sessionId);
		const definition = record?.registries.actions.get(actionId);
		if (!definition) {
			return undefined;
		}
		const summary: SessionActionDefinitionSummary = {
			id: definition.id,
			name: definition.name,
		};
		if (definition.system !== undefined) {
			summary.system = definition.system;
		}
		return summary;
	}

	async runAiTurn(playerId: SessionRunAiRequest['playerId']): Promise<boolean> {
		const response = await this.#deps.runAiTurn({
			sessionId: this.#sessionId,
			playerId,
		});
		return response.ranTurn;
	}

	hasAiController(playerId: string): boolean {
		const record = getSessionRecord(this.#sessionId);
		if (!record) {
			return false;
		}
		const player = record.snapshot.game.players.find(
			(entry) => entry.id === playerId,
		);
		return Boolean(player?.aiControlled);
	}

	simulateUpcomingPhases(playerId: string) {
		const cached = this.#simulationCache.get(playerId);
		if (!cached) {
			const message = [
				'No simulation available for player',
				`"${playerId}"`,
				'in session',
				`"${this.#sessionId}".`,
			].join(' ');
			throw new Error(message);
		}
		return clone(cached);
	}

	advancePhase(): SessionAdvanceResult {
		if (this.#latestAdvance) {
			const result = clone(this.#latestAdvance);
			this.#latestAdvance = null;
			return result;
		}
		const record = getSessionRecord(this.#sessionId);
		if (!record) {
			const message = [
				'Unable to infer advance result for',
				this.#sessionId,
			].join(' ');
			throw new Error(`${message}.`);
		}
		const { snapshot } = record;
		const active = snapshot.game.players.find(
			(player) => player.id === snapshot.game.activePlayerId,
		);
		if (!active) {
			const message = [
				'Unable to infer advance result for',
				this.#sessionId,
			].join(' ');
			throw new Error(`${message}.`);
		}
		return {
			phase: snapshot.game.currentPhase,
			step: snapshot.game.currentStep,
			effects: [],
			player: active,
		};
	}

	setDevMode(enabled: boolean): void {
		const record = getSessionRecord(this.#sessionId);
		if (!record) {
			return;
		}
		record.snapshot.game.devMode = enabled;
	}

	updatePlayerName(playerId: string, name: string): void {
		const record = getSessionRecord(this.#sessionId);
		if (!record) {
			return;
		}
		const player = record.snapshot.game.players.find(
			(entry) => entry.id === playerId,
		);
		if (player) {
			player.name = name;
		}
	}

	recordAdvanceResult(result: SessionAdvanceResult): void {
		this.#latestAdvance = clone(result);
	}

	cacheSimulation(
		playerId: string,
		result: SessionSimulateResponse['result'],
	): void {
		this.#simulationCache.set(playerId, clone(result));
	}
}

const adapters = new Map<string, RemoteSessionAdapter>();

export function getOrCreateRemoteAdapter(
	sessionId: string,
	dependencies: RemoteSessionAdapterDependencies,
): RemoteSessionAdapter {
	let adapter = adapters.get(sessionId);
	if (!adapter) {
		adapter = new RemoteSessionAdapter(sessionId, dependencies);
		adapters.set(sessionId, adapter);
	}
	return adapter;
}

export function deleteRemoteAdapter(sessionId: string): void {
	adapters.delete(sessionId);
}

export function getRemoteAdapter(
	sessionId: string,
): RemoteSessionAdapter | undefined {
	return adapters.get(sessionId);
}
