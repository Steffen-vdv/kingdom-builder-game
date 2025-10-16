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
import type { LegacySession } from './sessionTypes';

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

type ActionMetadataListener = () => void;

const stableSerialize = (value: unknown): string => {
	if (value === null) {
		return 'null';
	}
	if (value === undefined) {
		return 'undefined';
	}
	if (typeof value !== 'object') {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		const entries = value.map((item) => stableSerialize(item));
		return `[${entries.join(',')}]`;
	}
	const entries = Object.entries(value as Record<string, unknown>)
		.map(([key, entry]) => [key, entry] as const)
		.sort(([first], [second]) => first.localeCompare(second))
		.map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`);
	return `{${entries.join(',')}}`;
};

const toMetadataKey = (
	actionId: string,
	params?: ActionParametersPayload,
): string => {
	return `${actionId}:${stableSerialize(params ?? null)}`;
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
	#actionCostListeners: Map<string, Set<ActionMetadataListener>>;
	#actionRequirementListeners: Map<string, Set<ActionMetadataListener>>;
	#actionOptionListeners: Map<string, Set<ActionMetadataListener>>;

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

	#notify(
		listeners: Map<string, Set<ActionMetadataListener>>,
		key: string,
	): void {
		const handlers = listeners.get(key);
		if (!handlers) {
			return;
		}
		for (const listener of handlers) {
			listener();
		}
	}

	#subscribe(
		listeners: Map<string, Set<ActionMetadataListener>>,
		key: string,
		listener: ActionMetadataListener,
	): () => void {
		let handlers = listeners.get(key);
		if (!handlers) {
			handlers = new Set();
			listeners.set(key, handlers);
		}
		handlers.add(listener);
		return () => {
			const current = listeners.get(key);
			if (!current) {
				return;
			}
			current.delete(listener);
			if (current.size === 0) {
				listeners.delete(key);
			}
		};
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
		const key = toMetadataKey(actionId, params);
		const cached = this.#actionCostCache.get(key);
		if (!cached) {
			return {};
		}
		return clone(cached);
	}

	hasActionCosts(actionId: string, params?: ActionParametersPayload): boolean {
		const key = toMetadataKey(actionId, params);
		return this.#actionCostCache.has(key);
	}

	subscribeActionCosts(
		actionId: string,
		params: ActionParametersPayload | undefined,
		listener: ActionMetadataListener,
	): () => void {
		const key = toMetadataKey(actionId, params);
		return this.#subscribe(this.#actionCostListeners, key, listener);
	}

	setActionCosts(
		actionId: string,
		params: ActionParametersPayload | undefined,
		costs: SessionActionCostMap | null,
	): void {
		const key = toMetadataKey(actionId, params);
		if (!costs) {
			this.#actionCostCache.delete(key);
		} else {
			this.#actionCostCache.set(key, clone(costs));
		}
		this.#notify(this.#actionCostListeners, key);
	}

	getActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionRequirementList {
		const key = toMetadataKey(actionId, params);
		const cached = this.#actionRequirementCache.get(key);
		if (!cached) {
			return [];
		}
		return clone(cached);
	}

	hasActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
	): boolean {
		const key = toMetadataKey(actionId, params);
		return this.#actionRequirementCache.has(key);
	}

	subscribeActionRequirements(
		actionId: string,
		params: ActionParametersPayload | undefined,
		listener: ActionMetadataListener,
	): () => void {
		const key = toMetadataKey(actionId, params);
		return this.#subscribe(this.#actionRequirementListeners, key, listener);
	}

	setActionRequirements(
		actionId: string,
		params: ActionParametersPayload | undefined,
		requirements: SessionActionRequirementList | null,
	): void {
		const key = toMetadataKey(actionId, params);
		if (!requirements) {
			this.#actionRequirementCache.delete(key);
		} else {
			this.#actionRequirementCache.set(key, clone(requirements));
		}
		this.#notify(this.#actionRequirementListeners, key);
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

	subscribeActionOptions(
		actionId: string,
		listener: ActionMetadataListener,
	): () => void {
		return this.#subscribe(this.#actionOptionListeners, actionId, listener);
	}

	setActionOptions(actionId: string, groups: ActionEffectGroup[] | null): void {
		if (!groups) {
			this.#actionOptionCache.delete(actionId);
		} else {
			this.#actionOptionCache.set(actionId, clone(groups));
		}
		this.#notify(this.#actionOptionListeners, actionId);
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
