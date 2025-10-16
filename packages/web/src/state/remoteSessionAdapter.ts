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
import type {
	ActionEffectGroup,
	SessionActionCostRequest,
	SessionActionOptionsRequest,
	SessionActionRequirementRequest,
} from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { GameApi, GameApiRequestOptions } from '../services/gameApi';
import {
	assertSessionRecord,
	enqueueSessionTask,
	getSessionRecord,
} from './sessionStateStore';
import type { LegacySession } from './sessionTypes';

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
	#actionCostCache: Map<string, Map<string, SessionActionCostMap>>;
	#actionRequirementCache: Map<
		string,
		Map<string, SessionActionRequirementList>
	>;
	#actionOptionCache: Map<string, ActionEffectGroup[]>;
	#actionMetadataVersions: Map<string, number>;
	#metadataListeners: Map<string, Set<() => void>>;

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
		this.#actionMetadataVersions = new Map();
		this.#metadataListeners = new Map();
	}

	#getParamsKey(params?: ActionParametersPayload): string {
		if (params === undefined) {
			return '__no_params__';
		}
		return JSON.stringify(params);
	}

	#bumpMetadataVersion(actionId: string): void {
		const current = this.#actionMetadataVersions.get(actionId) ?? 0;
		this.#actionMetadataVersions.set(actionId, current + 1);
	}

	#notifyMetadata(actionId: string): void {
		const listeners = this.#metadataListeners.get(actionId);
		if (!listeners) {
			return;
		}
		for (const listener of listeners) {
			listener();
		}
	}

	enqueue<T>(task: () => Promise<T> | T): Promise<T> {
		return enqueueSessionTask(this.#sessionId, task);
	}

	getSnapshot(): SessionSnapshot {
		const record = assertSessionRecord(this.#sessionId);
		return record.snapshot;
	}

	getActionCosts(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionCostMap {
		const actionCache = this.#actionCostCache.get(actionId);
		if (!actionCache) {
			return {};
		}
		const cached = actionCache.get(this.#getParamsKey(params));
		if (!cached) {
			return {};
		}
		return clone(cached);
	}

	hasActionCosts(actionId: string, params?: ActionParametersPayload): boolean {
		const actionCache = this.#actionCostCache.get(actionId);
		if (!actionCache) {
			return false;
		}
		return actionCache.has(this.#getParamsKey(params));
	}

	recordActionCosts(
		request: SessionActionCostRequest,
		response: SessionActionCostMap,
	): void {
		const actionKey = request.actionId;
		let actionCache = this.#actionCostCache.get(actionKey);
		if (!actionCache) {
			actionCache = new Map();
			this.#actionCostCache.set(actionKey, actionCache);
		}
		actionCache.set(this.#getParamsKey(request.params), clone(response));
		this.#bumpMetadataVersion(actionKey);
		this.#notifyMetadata(actionKey);
	}

	getActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionRequirementList {
		const actionCache = this.#actionRequirementCache.get(actionId);
		if (!actionCache) {
			return [];
		}
		const cached = actionCache.get(this.#getParamsKey(params));
		if (!cached) {
			return [];
		}
		return clone(cached);
	}

	hasActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
	): boolean {
		const actionCache = this.#actionRequirementCache.get(actionId);
		if (!actionCache) {
			return false;
		}
		return actionCache.has(this.#getParamsKey(params));
	}

	recordActionRequirements(
		request: SessionActionRequirementRequest,
		response: SessionActionRequirementList,
	): void {
		const actionKey = request.actionId;
		let actionCache = this.#actionRequirementCache.get(actionKey);
		if (!actionCache) {
			actionCache = new Map();
			this.#actionRequirementCache.set(actionKey, actionCache);
		}
		actionCache.set(this.#getParamsKey(request.params), clone(response));
		this.#bumpMetadataVersion(actionKey);
		this.#notifyMetadata(actionKey);
	}

	getActionOptions(actionId: string): ActionEffectGroup[] {
		const cached = this.#actionOptionCache.get(actionId);
		if (!cached) {
			return [];
		}
		return clone(cached);
	}

	hasActionOptions(actionId: string): boolean {
		return this.#actionOptionCache.has(actionId);
	}

	recordActionOptions(
		request: SessionActionOptionsRequest,
		response: ActionEffectGroup[],
	): void {
		this.#actionOptionCache.set(request.actionId, clone(response));
		this.#bumpMetadataVersion(request.actionId);
		this.#notifyMetadata(request.actionId);
	}

	subscribeActionMetadata(actionId: string, listener: () => void): () => void {
		let listeners = this.#metadataListeners.get(actionId);
		if (!listeners) {
			listeners = new Set();
			this.#metadataListeners.set(actionId, listeners);
		}
		listeners.add(listener);
		return () => {
			const current = this.#metadataListeners.get(actionId);
			if (!current) {
				return;
			}
			current.delete(listener);
			if (current.size === 0) {
				this.#metadataListeners.delete(actionId);
			}
		};
	}

	getActionMetadataVersion(actionId: string): number {
		return this.#actionMetadataVersions.get(actionId) ?? 0;
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
