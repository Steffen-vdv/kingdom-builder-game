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
import type { ActionEffectGroup, actions } from '@kingdom-builder/protocol';
import type { GameApi, GameApiRequestOptions } from '../services/gameApi';
import {
	assertSessionRecord,
	enqueueSessionTask,
	getSessionRecord,
} from './sessionStateStore';
import type {
	SessionActionMetadataSnapshot,
	SessionAdapter,
	SessionAiTurnResult,
} from './sessionTypes';
import { ActionMetadataCache } from './actionMetadataCache';
import { ActionMetadataSubscriptions } from './actionMetadataSubscriptions';
import { SessionAiSimulationManager } from './sessionAiSimulationManager';
import { SessionAdvanceManager } from './sessionAdvanceManager';

interface RemoteSessionAdapterDependencies {
	ensureGameApi: () => GameApi;
	runAiTurn: (
		request: SessionRunAiRequest,
		options?: GameApiRequestOptions,
	) => Promise<SessionRunAiResponse>;
}

export class RemoteSessionAdapter implements SessionAdapter {
	#sessionId: string;
	#dependencies: RemoteSessionAdapterDependencies;
	#advanceManager: SessionAdvanceManager;
	#metadataCache: ActionMetadataCache;
	#metadataSubscriptions: ActionMetadataSubscriptions;
	#aiSimulationManager: SessionAiSimulationManager;

	constructor(
		sessionId: string,
		dependencies: RemoteSessionAdapterDependencies,
	) {
		this.#sessionId = sessionId;
		this.#dependencies = dependencies;
		this.#metadataCache = new ActionMetadataCache();
		this.#metadataSubscriptions = new ActionMetadataSubscriptions({
			readMetadata: this.#readActionMetadata.bind(this),
		});
		this.#advanceManager = new SessionAdvanceManager(sessionId, {
			getSessionRecord: () => getSessionRecord(this.#sessionId),
		});
		this.#aiSimulationManager = new SessionAiSimulationManager(sessionId, {
			runAiTurn: (request) => this.#dependencies.runAiTurn(request),
			getSessionRecord: () => getSessionRecord(this.#sessionId),
		});
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
		params?: actions.ActionParametersPayload,
	): SessionActionCostMap {
		return this.#metadataCache.getActionCosts(actionId, params);
	}

	getActionRequirements(
		actionId: string,
		params?: actions.ActionParametersPayload,
	): SessionActionRequirementList {
		return this.#metadataCache.getActionRequirements(actionId, params);
	}

	getActionOptions(actionId: string): ActionEffectGroup[] {
		return this.#metadataCache.getActionOptions(actionId);
	}

	readActionMetadata(
		actionId: string,
		params?: actions.ActionParametersPayload,
	): SessionActionMetadataSnapshot {
		return this.#metadataCache.readActionMetadata(actionId, params);
	}

	subscribeActionMetadata(
		actionId: string,
		params: actions.ActionParametersPayload | undefined,
		listener: (snapshot: SessionActionMetadataSnapshot) => void,
	): () => void {
		return this.#metadataSubscriptions.subscribe(actionId, params, listener);
	}

	setActionCosts(
		actionId: string,
		costs: SessionActionCostMap,
		params?: actions.ActionParametersPayload,
	): void {
		const key = this.#metadataCache.cacheActionCosts(actionId, costs, params);
		this.#metadataSubscriptions.emitForKey(key);
	}

	setActionRequirements(
		actionId: string,
		requirements: SessionActionRequirementList,
		params?: actions.ActionParametersPayload,
	): void {
		const key = this.#metadataCache.cacheActionRequirements(
			actionId,
			requirements,
			params,
		);
		this.#metadataSubscriptions.emitForKey(key);
	}

	setActionOptions(actionId: string, groups: ActionEffectGroup[]): void {
		this.#metadataCache.cacheActionOptions(actionId, groups);
		this.#metadataSubscriptions.emitAll(actionId);
	}

	resetActionMetadata(): void {
		const keys = this.#metadataCache.clear();
		for (const key of keys) {
			this.#metadataSubscriptions.emitForKey(key);
		}
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

	async runAiTurn(
		playerId: SessionRunAiRequest['playerId'],
	): Promise<SessionAiTurnResult> {
		return this.#aiSimulationManager.runAiTurn(playerId);
	}

	hasAiController(playerId: string): boolean {
		return this.#aiSimulationManager.hasAiController(playerId);
	}

	simulateUpcomingPhases(playerId: string) {
		return this.#aiSimulationManager.simulateUpcomingPhases(playerId);
	}

	advancePhase(): SessionAdvanceResult {
		return this.#advanceManager.advancePhase();
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
		this.#advanceManager.recordAdvanceResult(result);
	}

	#readActionMetadata(
		actionId: string,
		params: actions.ActionParametersPayload | undefined,
	): SessionActionMetadataSnapshot {
		return this.#metadataCache.readActionMetadata(actionId, params);
	}

	cacheSimulation(
		playerId: string,
		result: SessionSimulateResponse['result'],
	): void {
		this.#aiSimulationManager.cacheSimulation(playerId, result);
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
