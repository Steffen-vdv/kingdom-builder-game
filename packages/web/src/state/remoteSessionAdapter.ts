import type {
	SessionActionCostMap,
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionDefinitionSummary,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionActionRequirementList,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionAdvanceResult,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateResponse,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type { GameApi, GameApiRequestOptions } from '../services/gameApi';
import {
	assertSessionRecord,
	enqueueSessionTask,
	getSessionRecord,
} from './sessionStateStore';
import type { LegacySession } from './sessionTypes';
import {
	addListener,
	addNestedListener,
	emitListeners,
	emitNestedListeners,
	serializeActionParams,
	cloneValue as clone,
	type ActionCostListener,
	type ActionOptionListener,
	type ActionRequirementListener,
} from './actionMetadataCache';

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
	#actionCostListeners: Map<string, Map<string, Set<ActionCostListener>>>;
	#actionRequirementListeners: Map<
		string,
		Map<string, Set<ActionRequirementListener>>
	>;
	#actionOptionListeners: Map<string, Set<ActionOptionListener>>;

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
		this.#actionCostListeners = new Map();
		this.#actionRequirementListeners = new Map();
		this.#actionOptionListeners = new Map();
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
		params?: SessionActionCostRequest['params'],
	): SessionActionCostMap {
		const paramsKey = serializeActionParams(params);
		const actionCache = this.#actionCostCache.get(actionId);
		const cached = actionCache?.get(paramsKey);
		if (!cached) {
			return {};
		}
		return clone(cached);
	}

	getActionRequirements(
		actionId: string,
		params?: SessionActionRequirementRequest['params'],
	): SessionActionRequirementList {
		const paramsKey = serializeActionParams(params);
		const actionCache = this.#actionRequirementCache.get(actionId);
		const cached = actionCache?.get(paramsKey);
		if (!cached) {
			return [];
		}
		return clone(cached);
	}

	getActionOptions(actionId: string): ActionEffectGroup[] {
		const cached = this.#actionOptionCache.get(actionId);
		if (!cached) {
			return [];
		}
		return clone(cached);
	}

	recordActionCosts(
		request: SessionActionCostRequest,
		response: SessionActionCostResponse,
	): void {
		const paramsKey = serializeActionParams(request.params);
		let actionCache = this.#actionCostCache.get(request.actionId);
		if (!actionCache) {
			actionCache = new Map();
			this.#actionCostCache.set(request.actionId, actionCache);
		}
		actionCache.set(paramsKey, clone(response.costs));
		emitNestedListeners(
			this.#actionCostListeners,
			request.actionId,
			paramsKey,
			response.costs,
			clone,
		);
	}

	recordActionRequirements(
		request: SessionActionRequirementRequest,
		response: SessionActionRequirementResponse,
	): void {
		const paramsKey = serializeActionParams(request.params);
		let actionCache = this.#actionRequirementCache.get(request.actionId);
		if (!actionCache) {
			actionCache = new Map();
			this.#actionRequirementCache.set(request.actionId, actionCache);
		}
		actionCache.set(paramsKey, clone(response.requirements));
		emitNestedListeners(
			this.#actionRequirementListeners,
			request.actionId,
			paramsKey,
			response.requirements,
			clone,
		);
	}

	recordActionOptions(
		request: SessionActionOptionsRequest,
		response: SessionActionOptionsResponse,
	): void {
		const clonedGroups = clone(response.groups);
		this.#actionOptionCache.set(request.actionId, clonedGroups);
		emitListeners(
			this.#actionOptionListeners,
			request.actionId,
			clonedGroups,
			clone,
		);
	}

	subscribeActionCosts(
		actionId: string,
		params: SessionActionCostRequest['params'],
		listener: ActionCostListener,
	): () => void {
		const paramsKey = serializeActionParams(params);
		return addNestedListener(
			this.#actionCostListeners,
			actionId,
			paramsKey,
			listener,
		);
	}

	subscribeActionRequirements(
		actionId: string,
		params: SessionActionRequirementRequest['params'],
		listener: ActionRequirementListener,
	): () => void {
		const paramsKey = serializeActionParams(params);
		return addNestedListener(
			this.#actionRequirementListeners,
			actionId,
			paramsKey,
			listener,
		);
	}

	subscribeActionOptions(
		actionId: string,
		listener: ActionOptionListener,
	): () => void {
		return addListener(this.#actionOptionListeners, actionId, listener);
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
