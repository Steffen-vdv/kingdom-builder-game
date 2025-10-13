import type {
	ActionExecuteErrorResponse,
	ActionExecuteRequest,
	ActionExecuteResponse,
	ActionExecuteSuccessResponse,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionRuleSnapshot,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionUpdatePlayerNameRequest,
	SessionUpdatePlayerNameResponse,
} from '@kingdom-builder/protocol/session';
import {
	applySessionState,
	deleteSessionRecord,
	enqueueSessionTask,
	initializeSessionState,
	updateSessionSnapshot,
} from './sessionStateStore';
import {
	type Session,
	type SessionRegistries,
	type SessionResourceKeys,
} from './sessionTypes';
import {
	createGameApi,
	type GameApi,
	type GameApiRequestOptions,
} from '../services/gameApi';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import {
	deleteRemoteAdapter,
	getOrCreateRemoteAdapter,
	getRemoteAdapter,
} from './remoteSessionAdapter';
import type { RemoteSessionAdapter } from './remoteSessionAdapter';
import { SessionMirroringError, markFatalSessionError } from './sessionErrors';

interface CreateSessionOptions {
	devMode?: boolean;
	playerName?: string;
}

export interface CreateSessionResult {
	sessionId: string;
	session: Session;
	snapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: SessionResourceKeys;
	metadata: SessionSnapshotMetadata;
}
type ActionRequirementFailure =
	ActionExecuteErrorResponse['requirementFailure'];
type ActionRequirementFailures =
	ActionExecuteErrorResponse['requirementFailures'];
type ActionExecutionFailure = Error & {
	requirementFailure?: ActionRequirementFailure;
	requirementFailures?: ActionRequirementFailures;
};

export interface FetchSnapshotResult {
	session: Session;
	snapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: SessionResourceKeys;
	metadata: SessionSnapshotMetadata;
}
const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};
let gameApi: GameApi | null = null;
function ensureGameApi(): GameApi {
	if (!gameApi) {
		gameApi = createGameApi();
	}
	return gameApi;
}

export function setGameApi(instance: GameApi | null): void {
	gameApi = instance;
}

function getAdapter(sessionId: string): RemoteSessionAdapter {
	return getOrCreateRemoteAdapter(sessionId, {
		ensureGameApi,
		runAiTurn: runAiTurnInternal,
	});
}

export async function createSession(
	options: CreateSessionOptions = {},
	requestOptions: GameApiRequestOptions = {},
): Promise<CreateSessionResult> {
	const devMode = options.devMode ?? false;
	const playerName = options.playerName ?? DEFAULT_PLAYER_NAME;
	const sessionRequest: SessionCreateRequest = {
		devMode,
		playerNames: { A: playerName },
	};
	const api = ensureGameApi();
	const response = await api.createSession(sessionRequest, requestOptions);
	const stateRecord = initializeSessionState(response);
	const adapter = getAdapter(response.sessionId);
	return {
		sessionId: response.sessionId,
		session: adapter,
		snapshot: stateRecord.snapshot,
		ruleSnapshot: stateRecord.ruleSnapshot,
		registries: stateRecord.registries,
		resourceKeys: stateRecord.resourceKeys,
		metadata: stateRecord.metadata,
	};
}

export async function fetchSnapshot(
	sessionId: string,
	requestOptions: GameApiRequestOptions = {},
): Promise<FetchSnapshotResult> {
	const api = ensureGameApi();
	const adapter = getAdapter(sessionId);
	const response = await api.fetchSnapshot(sessionId, requestOptions);
	const stateRecord = applySessionState(response);
	return {
		session: adapter,
		snapshot: stateRecord.snapshot,
		ruleSnapshot: stateRecord.ruleSnapshot,
		registries: stateRecord.registries,
		resourceKeys: stateRecord.resourceKeys,
		metadata: stateRecord.metadata,
	};
}

export async function setSessionDevMode(
	sessionId: string,
	enabled: boolean,
	requestOptions: GameApiRequestOptions = {},
): Promise<FetchSnapshotResult> {
	const api = ensureGameApi();
	const adapter = getAdapter(sessionId);
	const response = await enqueueSessionTask(sessionId, async () =>
		api.setDevMode({ sessionId, enabled }, requestOptions),
	);
	const stateRecord = applySessionState(response);
	adapter.setDevMode(enabled);
	return {
		session: adapter,
		snapshot: stateRecord.snapshot,
		ruleSnapshot: stateRecord.ruleSnapshot,
		registries: stateRecord.registries,
		resourceKeys: stateRecord.resourceKeys,
		metadata: stateRecord.metadata,
	};
}

function normalizeActionError(error: unknown): ActionExecuteErrorResponse {
	const failure = error as ActionExecutionFailure;
	const response: ActionExecuteErrorResponse = {
		status: 'error',
		error: failure?.message ?? 'Action failed.',
	};
	if (failure?.requirementFailure) {
		response.requirementFailure = failure.requirementFailure;
	}
	if (failure?.requirementFailures) {
		response.requirementFailures = failure.requirementFailures;
	}
	if (!response.requirementFailure && !response.requirementFailures) {
		response.fatal = true;
	}
	return response;
}

export async function performSessionAction(
	request: ActionExecuteRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<ActionExecuteResponse> {
	const api = ensureGameApi();
	try {
		return await enqueueSessionTask(request.sessionId, async () => {
			const response = await api.performAction(request, requestOptions);
			if (response.status === 'success') {
				applyActionSnapshot(request.sessionId, response);
			}
			return response;
		});
	} catch (error) {
		if (error instanceof SessionMirroringError) {
			markFatalSessionError(error);
			throw error;
		}
		return normalizeActionError(error);
	}
}

function applyActionSnapshot(
	sessionId: string,
	response: ActionExecuteSuccessResponse,
): void {
	try {
		updateSessionSnapshot(sessionId, response.snapshot);
	} catch (cause) {
		throw new SessionMirroringError(
			'Failed to update session snapshot after action.',
			{
				cause,
				details: {
					sessionId,
				},
			},
		);
	}
}

export async function advanceSessionPhase(
	request: SessionAdvanceRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<SessionAdvanceResponse> {
	const api = ensureGameApi();
	const adapter = getAdapter(request.sessionId);
	const response = await enqueueSessionTask(request.sessionId, async () =>
		api.advancePhase(request, requestOptions),
	);
	const stateRecord = applySessionState(response);
	adapter.recordAdvanceResult(response.advance);
	return {
		sessionId: response.sessionId,
		snapshot: stateRecord.snapshot,
		registries: response.registries,
		advance: clone(response.advance),
	};
}

async function runAiTurnInternal(
	request: SessionRunAiRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<SessionRunAiResponse> {
	const api = ensureGameApi();
	const adapter = getAdapter(request.sessionId);
	const response = await enqueueSessionTask(request.sessionId, async () =>
		api.runAiTurn(request, requestOptions),
	);
	const stateRecord = applySessionState(response);
	const activePlayer = stateRecord.snapshot.game.players.find(
		(entry) => entry.id === stateRecord.snapshot.game.activePlayerId,
	);
	if (activePlayer) {
		adapter.recordAdvanceResult({
			phase: stateRecord.snapshot.game.currentPhase,
			step: stateRecord.snapshot.game.currentStep,
			effects: [],
			player: activePlayer,
		});
	}
	return {
		sessionId: response.sessionId,
		snapshot: stateRecord.snapshot,
		registries: response.registries,
		ranTurn: response.ranTurn,
	};
}

export async function runAiTurn(
	request: SessionRunAiRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<SessionRunAiResponse> {
	return runAiTurnInternal(request, requestOptions);
}

async function simulateUpcomingPhasesInternal(
	request: SessionSimulateRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<SessionSimulateResponse> {
	const api = ensureGameApi();
	const response = await api.simulateUpcomingPhases(request, requestOptions);
	const adapter = getRemoteAdapter(request.sessionId);
	if (adapter) {
		adapter.cacheSimulation(request.playerId, response.result);
	}
	return clone(response);
}

export async function simulateUpcomingPhases(
	request: SessionSimulateRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<SessionSimulateResponse> {
	return simulateUpcomingPhasesInternal(request, requestOptions);
}

export async function updatePlayerName(
	request: SessionUpdatePlayerNameRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<SessionUpdatePlayerNameResponse> {
	const api = ensureGameApi();
	const adapter = getAdapter(request.sessionId);
	const response = await enqueueSessionTask(request.sessionId, async () =>
		api.updatePlayerName(request, requestOptions),
	);
	const stateRecord = applySessionState(response);
	const player = stateRecord.snapshot.game.players.find(
		(entry) => entry.id === request.playerId,
	);
	if (player) {
		adapter.updatePlayerName(request.playerId, player.name);
	}
	return {
		sessionId: response.sessionId,
		snapshot: stateRecord.snapshot,
		registries: response.registries,
	};
}

export function releaseSession(sessionId: string): void {
	deleteSessionRecord(sessionId);
	deleteRemoteAdapter(sessionId);
}
