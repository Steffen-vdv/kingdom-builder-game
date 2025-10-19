import type {
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateResponse,
} from '@kingdom-builder/protocol/session';
import { cloneValue } from './cloneValue';
import type { SessionStateRecord } from './sessionStateStore';
import type { SessionAiTurnResult } from './sessionTypes';

interface SessionAiSimulationManagerDependencies {
	runAiTurn: (request: SessionRunAiRequest) => Promise<SessionRunAiResponse>;
	getSessionRecord: () => SessionStateRecord | undefined;
}

export class SessionAiSimulationManager {
	#sessionId: string;
	#dependencies: SessionAiSimulationManagerDependencies;
	#simulationCache: Map<string, SessionSimulateResponse['result']>;

	constructor(
		sessionId: string,
		dependencies: SessionAiSimulationManagerDependencies,
	) {
		this.#sessionId = sessionId;
		this.#dependencies = dependencies;
		this.#simulationCache = new Map();
	}

	async runAiTurn(
		playerId: SessionRunAiRequest['playerId'],
	): Promise<SessionAiTurnResult> {
		const response = await this.#dependencies.runAiTurn({
			sessionId: this.#sessionId,
			playerId,
		});
		const record = this.#dependencies.getSessionRecord();
		if (!record) {
			const message = [
				'Missing session record for AI turn in session',
				`"${this.#sessionId}".`,
			].join(' ');
			throw new Error(message);
		}
		return {
			ranTurn: response.ranTurn,
			actions: cloneValue(response.actions),
			phaseComplete: response.phaseComplete,
			snapshot: record.snapshot,
			registries: record.registries,
		};
	}

	hasAiController(playerId: string): boolean {
		const record = this.#dependencies.getSessionRecord();
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
		return cloneValue(cached);
	}

	cacheSimulation(
		playerId: string,
		result: SessionSimulateResponse['result'],
	): void {
		this.#simulationCache.set(playerId, cloneValue(result));
	}
}
