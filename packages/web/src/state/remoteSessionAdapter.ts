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
	#actionCostCache: Map<string, SessionActionCostMap>;
	#actionRequirementCache: Map<string, SessionActionRequirementList>;
	#actionOptionCache: Map<string, ActionEffectGroup[]>;

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
	}

	static #serializeParams(params: Record<string, unknown> | undefined) {
		if (!params) {
			return '';
		}
		const normalize = (value: unknown): unknown => {
			if (Array.isArray(value)) {
				return value.map(normalize);
			}
			if (value && typeof value === 'object') {
				const entries = Object.entries(value as Record<string, unknown>)
					.map(([key, nested]) => [key, normalize(nested)] as const)
					.sort(([first], [second]) => first.localeCompare(second));
				return Object.fromEntries(entries);
			}
			return value;
		};
		return JSON.stringify(normalize(params));
	}

	static #buildCacheKey(
		actionId: string,
		params: Record<string, unknown> | undefined,
	): string {
		const serialized = RemoteSessionAdapter.#serializeParams(params);
		return serialized ? `${actionId}:${serialized}` : actionId;
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
		params?: Record<string, unknown>,
	): SessionActionCostMap | null {
		const key = RemoteSessionAdapter.#buildCacheKey(actionId, params);
		const cached = this.#actionCostCache.get(key);
		if (!cached) {
			return null;
		}
		return clone(cached);
	}

	getActionRequirements(
		actionId: string,
		params?: Record<string, unknown>,
	): SessionActionRequirementList | null {
		const key = RemoteSessionAdapter.#buildCacheKey(actionId, params);
		const cached = this.#actionRequirementCache.get(key);
		if (!cached) {
			return null;
		}
		return clone(cached);
	}

	getActionOptions(
		actionId: string,
		params?: Record<string, unknown>,
	): ActionEffectGroup[] | null {
		const key = RemoteSessionAdapter.#buildCacheKey(actionId, params);
		const cached = this.#actionOptionCache.get(key);
		if (!cached) {
			return null;
		}
		return clone(cached);
	}

	primeActionCosts(
		actionId: string,
		params: Record<string, unknown> | undefined,
		costs: SessionActionCostMap,
	): void {
		const key = RemoteSessionAdapter.#buildCacheKey(actionId, params);
		this.#actionCostCache.set(key, clone(costs));
	}

	primeActionRequirements(
		actionId: string,
		params: Record<string, unknown> | undefined,
		requirements: SessionActionRequirementList,
	): void {
		const key = RemoteSessionAdapter.#buildCacheKey(actionId, params);
		this.#actionRequirementCache.set(key, clone(requirements));
	}

	primeActionOptions(
		actionId: string,
		params: Record<string, unknown> | undefined,
		groups: ActionEffectGroup[],
	): void {
		const key = RemoteSessionAdapter.#buildCacheKey(actionId, params);
		this.#actionOptionCache.set(key, clone(groups));
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
