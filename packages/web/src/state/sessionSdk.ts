import type {
	ActionExecuteRequest,
	ActionExecuteResponse,
	ActionParametersPayload,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
	SessionUpdatePlayerNameRequest,
	SessionUpdatePlayerNameResponse,
} from '@kingdom-builder/protocol/session';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import {
	applySessionState,
	deleteSessionRecord,
	enqueueSessionTask,
	initializeSessionState,
	type SessionStateRecord,
} from './sessionStateStore';
import { type Session, type RemoteSessionRecord } from './sessionTypes';
import { type GameApiRequestOptions } from '../services/gameApi';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import {
	deleteRemoteAdapter,
	getOrCreateRemoteAdapter,
	getRemoteAdapter,
} from './remoteSessionAdapter';
import type { RemoteSessionAdapter } from './remoteSessionAdapter';
import { SessionMirroringError, markFatalSessionError } from './sessionErrors';
import {
	ensureGameApi,
	setGameApi as setGameApiInstance,
} from './gameApiInstance';
import { clone } from './clone';
import {
	applyActionSnapshot,
	normalizeActionError,
} from './sessionSdk.helpers';

interface CreateSessionOptions {
	devMode?: boolean;
	playerName?: string;
}
export interface CreateSessionResult {
	sessionId: string;
	adapter: Session;
	record: RemoteSessionRecord;
}
export interface FetchSnapshotResult {
	sessionId: string;
	adapter: Session;
	record: RemoteSessionRecord;
}
function buildActionMetadataRequest(
	sessionId: string,
	actionId: string,
	params?: ActionParametersPayload,
) {
	return params ? { sessionId, actionId, params } : { sessionId, actionId };
}
function toRemoteRecord(record: SessionStateRecord): RemoteSessionRecord {
	return {
		sessionId: record.sessionId,
		snapshot: record.snapshot,
		ruleSnapshot: record.ruleSnapshot,
		registries: record.registries,
		resourceKeys: record.resourceKeys,
		metadata: record.metadata,
		queueSeed: record.queueSeed,
	};
}

function getAdapter(sessionId: string): RemoteSessionAdapter {
	return getOrCreateRemoteAdapter(sessionId, {
		ensureGameApi,
		runAiTurn: runAiTurnInternal,
	});
}
export { setGameApiInstance as setGameApi };
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
		adapter,
		record: toRemoteRecord(stateRecord),
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
		sessionId,
		adapter,
		record: toRemoteRecord(stateRecord),
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
		sessionId,
		adapter,
		record: toRemoteRecord(stateRecord),
	};
}

interface PerformSessionActionOptions {
	skipQueue?: boolean;
}

async function runPerformSessionAction(
	request: ActionExecuteRequest,
	requestOptions: GameApiRequestOptions,
	api: ReturnType<typeof ensureGameApi>,
): Promise<ActionExecuteResponse> {
	const response = await api.performAction(request, requestOptions);
	if (response.status === 'success') {
		applyActionSnapshot(request.sessionId, response);
	}
	return response;
}

export async function performSessionAction(
	request: ActionExecuteRequest,
	requestOptions: GameApiRequestOptions = {},
	options: PerformSessionActionOptions = {},
): Promise<ActionExecuteResponse> {
	const api = ensureGameApi();
	try {
		const execute = () => runPerformSessionAction(request, requestOptions, api);
		if (options.skipQueue) {
			return await execute();
		}
		return await enqueueSessionTask(request.sessionId, execute);
	} catch (error) {
		if (error instanceof SessionMirroringError) {
			markFatalSessionError(error);
			throw error;
		}
		return normalizeActionError(error);
	}
}
interface AdvanceSessionPhaseOptions {
	skipQueue?: boolean;
}

async function runAdvanceSessionPhase(
	request: SessionAdvanceRequest,
	requestOptions: GameApiRequestOptions,
	api: ReturnType<typeof ensureGameApi>,
	adapter: RemoteSessionAdapter,
): Promise<SessionAdvanceResponse> {
	const response = await api.advancePhase(request, requestOptions);
	const stateRecord = applySessionState(response);
	adapter.recordAdvanceResult(response.advance);
	return {
		sessionId: response.sessionId,
		snapshot: stateRecord.snapshot,
		registries: response.registries,
		advance: clone(response.advance),
	};
}

export async function advanceSessionPhase(
	request: SessionAdvanceRequest,
	requestOptions: GameApiRequestOptions = {},
	options: AdvanceSessionPhaseOptions = {},
): Promise<SessionAdvanceResponse> {
	const api = ensureGameApi();
	const adapter = getAdapter(request.sessionId);
	if (options.skipQueue) {
		return runAdvanceSessionPhase(request, requestOptions, api, adapter);
	}
	return enqueueSessionTask(request.sessionId, () =>
		runAdvanceSessionPhase(request, requestOptions, api, adapter),
	);
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

export { runAiTurnInternal as runAiTurn };
export async function loadActionCosts(
	sessionId: string,
	actionId: string,
	params?: ActionParametersPayload,
	requestOptions: GameApiRequestOptions = {},
): Promise<SessionActionCostMap> {
	const api = ensureGameApi();
	const adapter = getAdapter(sessionId);
	const response = await enqueueSessionTask(sessionId, () =>
		api.getActionCosts(
			buildActionMetadataRequest(sessionId, actionId, params),
			requestOptions,
		),
	);
	adapter.setActionCosts(actionId, response.costs, params);
	return clone(response.costs);
}

export async function loadActionRequirements(
	sessionId: string,
	actionId: string,
	params?: ActionParametersPayload,
	requestOptions: GameApiRequestOptions = {},
): Promise<SessionActionRequirementList> {
	const api = ensureGameApi();
	const adapter = getAdapter(sessionId);
	const response = await enqueueSessionTask(sessionId, () =>
		api.getActionRequirements(
			buildActionMetadataRequest(sessionId, actionId, params),
			requestOptions,
		),
	);
	adapter.setActionRequirements(actionId, response.requirements, params);
	return clone(response.requirements);
}

export async function loadActionOptions(
	sessionId: string,
	actionId: string,
	requestOptions: GameApiRequestOptions = {},
): Promise<ActionEffectGroup[]> {
	const api = ensureGameApi();
	const adapter = getAdapter(sessionId);
	const response = await enqueueSessionTask(sessionId, () =>
		api.getActionOptions(
			buildActionMetadataRequest(sessionId, actionId),
			requestOptions,
		),
	);
	adapter.setActionOptions(actionId, response.groups);
	return clone(response.groups);
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

export { simulateUpcomingPhasesInternal as simulateUpcomingPhases };

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
