import type {
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateResponse,
} from '@kingdom-builder/protocol/session';
import { cloneValue } from './cloneValue';
import type { SessionStateRecord } from './sessionStateStore';

interface SessionAiSimulationManagerDependencies {
	runAiTurn: (request: SessionRunAiRequest) => Promise<SessionRunAiResponse>;
	getSessionRecord: () => SessionStateRecord | undefined;
	applyAiRunResult: (response: SessionRunAiResponse) => void;
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

	async runAiTurn(playerId: SessionRunAiRequest['playerId']): Promise<boolean> {
		const response = await this.#dependencies.runAiTurn({
			sessionId: this.#sessionId,
			playerId,
		});
		this.#dependencies.applyAiRunResult(response);
		return response.ranTurn;
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
