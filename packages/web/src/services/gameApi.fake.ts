import type {
	ActionExecuteRequest,
	ActionExecuteResponse,
	ActionExecuteSuccessResponse,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionPlayerId,
	SessionMetadataSnapshotResponse,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
	SessionStateResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionUpdatePlayerNameRequest,
	SessionUpdatePlayerNameResponse,
} from '@kingdom-builder/protocol/session';
import { clone, clonePlayerResponseMap } from './gameApi.clone';
import type { RunAiMap, SimulationMap } from './gameApi.clone';
import { EMPTY_REGISTRIES, toStateResponse } from './gameApi.fake.helpers';
import type { GameApi, GameApiRequestOptions } from './gameApi';
import { GameApiError } from './gameApi';

type NextResponses = {
	create?: SessionCreateResponse;
	advance?: SessionAdvanceResponse;
	action?: ActionExecuteResponse;
	devMode?: SessionSetDevModeResponse;
	updatePlayerName?: SessionUpdatePlayerNameResponse;
	actionCost?: SessionActionCostResponse;
	actionRequirements?: SessionActionRequirementResponse;
	actionOptions?: SessionActionOptionsResponse;
	runAi?: SessionRunAiResponse;
	simulate?: SessionSimulateResponse;
	metadataSnapshot?: SessionMetadataSnapshotResponse;
};

export interface GameApiFakeState {
	sessions?: Map<string, SessionStateResponse>;
	simulations?: SimulationMap;
	aiRuns?: RunAiMap;
}

export class GameApiFake implements GameApi {
	#sessions: Map<string, SessionStateResponse>;
	#next: NextResponses;
	#simulationResults: SimulationMap;
	#runAiResponses: RunAiMap;

	constructor(state: GameApiFakeState = {}) {
		const sessionEntries = state.sessions
			? Array.from(
					state.sessions.entries(),
					([id, value]) => [id, clone(value)] as const,
				)
			: [];
		this.#sessions = new Map(sessionEntries);
		this.#next = {};
		this.#simulationResults = clonePlayerResponseMap(state.simulations);
		this.#runAiResponses = clonePlayerResponseMap(state.aiRuns);
	}
	setNextCreateResponse(response: SessionCreateResponse) {
		this.#primeNext('create', response);
	}
	setNextAdvanceResponse(response: SessionAdvanceResponse) {
		this.#primeNext('advance', response);
	}
	setNextActionResponse(response: ActionExecuteResponse) {
		this.#primeNext('action', response);
	}
	setNextMetadataSnapshotResponse(response: SessionMetadataSnapshotResponse) {
		this.#primeNext('metadataSnapshot', response);
	}
	setNextSetDevModeResponse(response: SessionSetDevModeResponse) {
		this.#primeNext('devMode', response);
	}
	setNextUpdatePlayerNameResponse(response: SessionUpdatePlayerNameResponse) {
		this.#primeNext('updatePlayerName', response);
	}
	setNextActionCostResponse(response: SessionActionCostResponse) {
		this.#primeNext('actionCost', response);
	}
	setNextActionRequirementResponse(response: SessionActionRequirementResponse) {
		this.#primeNext('actionRequirements', response);
	}
	setNextActionOptionsResponse(response: SessionActionOptionsResponse) {
		this.#primeNext('actionOptions', response);
	}
	setNextRunAiResponse(response: SessionRunAiResponse) {
		this.#primeNext('runAi', response);
	}
	setNextSimulationResponse(response: SessionSimulateResponse) {
		this.#primeNext('simulate', response);
	}
	primeRunAiResponse(
		sessionId: string,
		playerId: SessionPlayerId,
		response: SessionRunAiResponse,
	) {
		this.#ensureRunAiMap(sessionId).set(playerId, clone(response));
	}
	primeSimulationResult(
		sessionId: string,
		playerId: SessionPlayerId,
		response: SessionSimulateResponse,
	) {
		this.#ensureSimulationMap(sessionId).set(playerId, clone(response));
	}
	primeSession(response: SessionStateResponse) {
		this.#sessions.set(response.sessionId, clone(response));
	}
	createSession(
		_request: SessionCreateRequest = {},
		_options: GameApiRequestOptions = {},
	): Promise<SessionCreateResponse> {
		const response = this.#consumeNext(
			'create',
			'No create session response primed.',
		);
		this.#sessions.set(response.sessionId, toStateResponse(response));
		return Promise.resolve(clone(response));
	}
	fetchSnapshot(
		sessionId: string,
		_options: GameApiRequestOptions = {},
	): Promise<SessionStateResponse> {
		const session = this.#sessions.get(sessionId);
		if (!session) {
			return Promise.reject(
				new GameApiError('Unknown session.', 404, 'Not Found', { sessionId }),
			);
		}
		return Promise.resolve(clone(session));
	}
	fetchMetadataSnapshot(
		_options: GameApiRequestOptions = {},
	): Promise<SessionMetadataSnapshotResponse> {
		const response = this.#consumeNext(
			'metadataSnapshot',
			'No metadata snapshot response primed.',
		);
		return Promise.resolve(clone(response));
	}
	performAction(
		request: ActionExecuteRequest,
		_options: GameApiRequestOptions = {},
	): Promise<ActionExecuteResponse> {
		const response = this.#consumeNext('action', 'No action response primed.');
		if (this.#isSuccess(response)) {
			const current = this.#sessions.get(request.sessionId);
			const registries = clone(current ? current.registries : EMPTY_REGISTRIES);
			this.#sessions.set(request.sessionId, {
				sessionId: request.sessionId,
				snapshot: clone(response.snapshot),
				registries,
			});
		}
		return Promise.resolve(clone(response));
	}
	advancePhase(
		request: SessionAdvanceRequest,
		_options: GameApiRequestOptions = {},
	): Promise<SessionAdvanceResponse> {
		const response = this.#consumeNext(
			'advance',
			'No advance response primed.',
		);
		this.#sessions.set(request.sessionId, {
			sessionId: response.sessionId,
			snapshot: clone(response.snapshot),
			registries: clone(response.registries),
		});
		return Promise.resolve(clone(response));
	}
	setDevMode(
		_request: SessionSetDevModeRequest,
		_options: GameApiRequestOptions = {},
	): Promise<SessionSetDevModeResponse> {
		const response = this.#consumeNext(
			'devMode',
			'No set dev mode response primed.',
		);
		this.#sessions.set(response.sessionId, clone(response));
		return Promise.resolve(clone(response));
	}
	updatePlayerName(
		request: SessionUpdatePlayerNameRequest,
		_options: GameApiRequestOptions = {},
	): Promise<SessionUpdatePlayerNameResponse> {
		const primed = this.#pullNext('updatePlayerName');
		if (primed) {
			this.#sessions.set(primed.sessionId, clone(primed));
			return Promise.resolve(clone(primed));
		}
		const existing = this.#sessions.get(request.sessionId);
		if (!existing) {
			return Promise.reject(
				new GameApiError('Unknown session.', 404, 'Not Found', {
					sessionId: request.sessionId,
				}),
			);
		}
		const updated = clone(existing);
		const player = updated.snapshot.game.players.find(
			(entry) => entry.id === request.playerId,
		);
		if (!player) {
			return Promise.reject(
				new GameApiError('Unknown player.', 404, 'Not Found', {
					sessionId: request.sessionId,
					playerId: request.playerId,
				}),
			);
		}
		player.name = request.playerName;
		this.#sessions.set(request.sessionId, updated);
		return Promise.resolve(clone(updated));
	}
	getActionCosts(
		request: SessionActionCostRequest,
		_options: GameApiRequestOptions = {},
	): Promise<SessionActionCostResponse> {
		const response = this.#consumeNext(
			'actionCost',
			`No action cost response primed for action "${request.actionId}".`,
		);
		return Promise.resolve(clone(response));
	}
	getActionRequirements(
		request: SessionActionRequirementRequest,
		_options: GameApiRequestOptions = {},
	): Promise<SessionActionRequirementResponse> {
		const response = this.#consumeNext(
			'actionRequirements',
			`No action requirements response primed for action "${request.actionId}".`,
		);
		return Promise.resolve(clone(response));
	}
	getActionOptions(
		request: SessionActionOptionsRequest,
		_options: GameApiRequestOptions = {},
	): Promise<SessionActionOptionsResponse> {
		const response = this.#consumeNext(
			'actionOptions',
			`No action options response primed for action "${request.actionId}".`,
		);
		return Promise.resolve(clone(response));
	}
	runAiTurn(
		request: SessionRunAiRequest,
		_options: GameApiRequestOptions = {},
	): Promise<SessionRunAiResponse> {
		const response = this.#pullNext('runAi') ?? this.#lookupRunAi(request);
		this.#sessions.set(response.sessionId, toStateResponse(response));
		return Promise.resolve(clone(response));
	}
	simulateUpcomingPhases(
		request: SessionSimulateRequest,
		_options: GameApiRequestOptions = {},
	): Promise<SessionSimulateResponse> {
		const response =
			this.#pullNext('simulate') ?? this.#lookupSimulation(request);
		return Promise.resolve(clone(response));
	}
	#primeNext<K extends keyof NextResponses>(
		key: K,
		response: NextResponses[K],
	) {
		this.#next[key] = clone(response);
	}
	#consumeNext<K extends keyof NextResponses>(
		key: K,
		message: string,
	): NonNullable<NextResponses[K]> {
		const response = this.#next[key];
		if (!response) {
			throw new Error(message);
		}
		delete this.#next[key];
		return response as NonNullable<NextResponses[K]>;
	}
	#pullNext<K extends keyof NextResponses>(
		key: K,
	): NextResponses[K] | undefined {
		const response = this.#next[key];
		if (response) {
			delete this.#next[key];
		}
		return response;
	}
	#ensureRunAiMap(
		sessionId: string,
	): Map<SessionPlayerId, SessionRunAiResponse> {
		let map = this.#runAiResponses.get(sessionId);
		if (!map) {
			map = new Map<SessionPlayerId, SessionRunAiResponse>();
			this.#runAiResponses.set(sessionId, map);
		}
		return map;
	}
	#ensureSimulationMap(
		sessionId: string,
	): Map<SessionPlayerId, SessionSimulateResponse> {
		let map = this.#simulationResults.get(sessionId);
		if (!map) {
			map = new Map<SessionPlayerId, SessionSimulateResponse>();
			this.#simulationResults.set(sessionId, map);
		}
		return map;
	}
	#lookupRunAi(request: SessionRunAiRequest): SessionRunAiResponse {
		const map = this.#runAiResponses.get(request.sessionId);
		const response = map?.get(request.playerId);
		if (!response) {
			throw new Error(
				`No run AI response primed for session "${request.sessionId}" and player ` +
					`"${request.playerId}".`,
			);
		}
		return response;
	}
	#lookupSimulation(request: SessionSimulateRequest): SessionSimulateResponse {
		const map = this.#simulationResults.get(request.sessionId);
		const response = map?.get(request.playerId);
		if (!response) {
			throw new Error(
				`No simulation response primed for session "${request.sessionId}" and player ` +
					`"${request.playerId}".`,
			);
		}
		return response;
	}
	#isSuccess(
		response: ActionExecuteResponse,
	): response is ActionExecuteSuccessResponse {
		return response.status === 'success';
	}
}
