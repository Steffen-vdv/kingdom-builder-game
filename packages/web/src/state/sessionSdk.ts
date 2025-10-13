import type { EngineSession } from '@kingdom-builder/engine';
import type {
	ActionExecuteErrorResponse,
	ActionExecuteRequest,
	ActionExecuteResponse,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionUpdatePlayerNameRequest,
} from '@kingdom-builder/protocol/session';
import {
	deserializeSessionRegistries,
	type SessionRegistries,
} from './sessionRegistries';
import {
	createGameApi,
	type GameApi,
	type GameApiRequestOptions,
} from '../services/gameApi';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import {
	createLegacySession,
	type ResourceKey,
} from './legacySessionBootstrap';
import {
	getSessionRecord as getSessionRecordImpl,
	registerSession,
	releaseSessionRecord,
	updateRecordSnapshot as updateRecordSnapshotImpl,
	updateRecordState as updateRecordStateImpl,
	type SessionHandle,
	type SessionRecord,
} from './remoteSessionStore';
import {
	SessionMirroringError,
	markFatalSessionError,
	isFatalSessionError,
} from './sessionErrors';

interface CreateSessionOptions {
	devMode?: boolean;
	playerName?: string;
}

interface CreateSessionResult {
	sessionId: string;
	session: SessionHandle;
	legacySession: EngineSession;
	snapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
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

interface FetchSnapshotResult {
	session: SessionHandle;
	legacySession: EngineSession;
	snapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
	metadata: SessionSnapshotMetadata;
}

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

function getSessionRecord(sessionId: string): SessionRecord {
	try {
		return getSessionRecordImpl(sessionId);
	} catch (error) {
		markFatalSessionError(error);
		throw error;
	}
}

/**
 * Creates a new game session via the remote API.
 *
 * @param options - Configuration for the local session bootstrap.
 * @param requestOptions - Transport settings such as an abort signal.
 */
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
	const legacy = await createLegacySession({
		sessionId: response.sessionId,
		devMode,
		playerName,
		registries: response.registries,
	});
	const record = registerSession({
		sessionId: response.sessionId,
		legacySession: legacy.session,
		registries: legacy.registries,
		resourceKeys: legacy.resourceKeys,
		snapshot: response.snapshot,
		metadata: response.snapshot.metadata,
	});
	return {
		sessionId: response.sessionId,
		session: record.handle,
		legacySession: legacy.session,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries: record.registries,
		resourceKeys: record.resourceKeys,
		metadata: response.snapshot.metadata,
	};
}

/**
 * Retrieves the latest snapshot for the provided session.
 *
 * @param sessionId - Target session identifier.
 * @param requestOptions - Transport settings such as an abort signal.
 */
export async function fetchSnapshot(
	sessionId: string,
	requestOptions: GameApiRequestOptions = {},
): Promise<FetchSnapshotResult> {
	const api = ensureGameApi();
	const record = getSessionRecord(sessionId);
	const response = await api.fetchSnapshot(sessionId, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	updateRecordStateImpl(
		record,
		response.snapshot,
		registries,
		response.snapshot.metadata,
	);
	return {
		session: record.handle,
		legacySession: record.legacySession,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries,
		resourceKeys: record.resourceKeys,
		metadata: response.snapshot.metadata,
	};
}

export async function setSessionDevMode(
	sessionId: string,
	enabled: boolean,
	requestOptions: GameApiRequestOptions = {},
): Promise<FetchSnapshotResult> {
	const api = ensureGameApi();
	const record = getSessionRecord(sessionId);
	const response = await api.setDevMode({ sessionId, enabled }, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	record.legacySession.setDevMode(enabled);
	updateRecordStateImpl(
		record,
		response.snapshot,
		registries,
		response.snapshot.metadata,
	);
	return {
		session: record.handle,
		legacySession: record.legacySession,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries,
		resourceKeys: record.resourceKeys,
		metadata: response.snapshot.metadata,
	};
}

export async function updateSessionPlayerName(
	request: SessionUpdatePlayerNameRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<FetchSnapshotResult> {
	const api = ensureGameApi();
	const record = getSessionRecord(request.sessionId);
	const response = await api.updatePlayerName(request, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	updateRecordStateImpl(
		record,
		response.snapshot,
		registries,
		response.snapshot.metadata,
	);
	const updatedPlayer = response.snapshot.game.players.find(
		(player) => player.id === request.playerId,
	);
	if (updatedPlayer) {
		record.legacySession.updatePlayerName(updatedPlayer.id, updatedPlayer.name);
	}
	return {
		session: record.handle,
		legacySession: record.legacySession,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries,
		resourceKeys: record.resourceKeys,
		metadata: response.snapshot.metadata,
	};
}

/**
 * Executes an action against the remote session and mirrors it locally.
 *
 * @param request - Action execution payload.
 * @param requestOptions - Transport settings such as an abort signal.
 */
export async function performSessionAction(
	request: ActionExecuteRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<ActionExecuteResponse> {
	const api = ensureGameApi();
	const record = getSessionRecord(request.sessionId);
	try {
		const response = await api.performAction(request, requestOptions);
		if (response.status === 'success') {
			try {
				const params = request.params;
				updateRecordSnapshotImpl(record, response.snapshot);
				record.legacySession.performAction(request.actionId, params);
			} catch (localError) {
				const error = new SessionMirroringError(
					'Local session failed to mirror remote action.',
					{
						cause: localError,
						details: {
							sessionId: request.sessionId,
							actionId: request.actionId,
						},
					},
				);
				throw error;
			}
		}
		return response;
	} catch (error) {
		if (error instanceof SessionMirroringError) {
			markFatalSessionError(error);
			throw error;
		}
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
}

/**
 * Advances the remote session phase and updates local caches.
 *
 * @param request - Phase advance payload.
 * @param requestOptions - Transport settings such as an abort signal.
 */
export async function advanceSessionPhase(
	request: SessionAdvanceRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<SessionAdvanceResponse> {
	const api = ensureGameApi();
	const record = getSessionRecord(request.sessionId);
	const response = await api.advancePhase(request, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	updateRecordStateImpl(
		record,
		response.snapshot,
		registries,
		response.snapshot.metadata,
	);
	try {
		record.legacySession.advancePhase();
	} catch (localError) {
		const error = new SessionMirroringError(
			'Local session failed to mirror remote phase advance.',
			{
				cause: localError,
				details: {
					sessionId: request.sessionId,
				},
			},
		);
		throw error;
	}
	return response;
}

export function releaseSession(sessionId: string): void {
	releaseSessionRecord(sessionId);
}

export type { CreateSessionResult, FetchSnapshotResult, SessionHandle };
export { SessionMirroringError, markFatalSessionError, isFatalSessionError };
