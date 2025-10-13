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
	SessionUpdatePlayerNameResponse,
} from '@kingdom-builder/protocol/session';
import {
	deserializeSessionRegistries,
	extractResourceKeys,
	type SessionRegistries,
} from './sessionRegistries';
import {
	createLegacySessionMirror,
	getLegacySessionRecord,
	markFatalSessionError,
	mergeLegacySessionCaches,
	replaceLegacySessionCaches,
	releaseLegacySession,
	SessionMirroringError,
	type ResourceKey,
	type SessionHandle,
} from './legacySessionMirror';
import {
	createGameApi,
	type GameApi,
	type GameApiRequestOptions,
} from '../services/gameApi';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';

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
	const mirror = await createLegacySessionMirror({
		sessionId: response.sessionId,
		devMode,
		playerName,
		registries: response.registries,
	});
	return {
		sessionId: mirror.sessionId,
		session: mirror.session,
		legacySession: mirror.legacySession,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries: mirror.registries,
		resourceKeys: mirror.resourceKeys,
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
	const record = getLegacySessionRecord(sessionId);
	const response = await api.fetchSnapshot(sessionId, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: ResourceKey[] = extractResourceKeys(registries);
	replaceLegacySessionCaches(record, registries, resourceKeys);
	return {
		session: record.handle,
		legacySession: record.legacySession,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries,
		resourceKeys,
		metadata: response.snapshot.metadata,
	};
}

export async function setSessionDevMode(
	sessionId: string,
	enabled: boolean,
	requestOptions: GameApiRequestOptions = {},
): Promise<FetchSnapshotResult> {
	const api = ensureGameApi();
	const record = getLegacySessionRecord(sessionId);
	const response = await api.setDevMode({ sessionId, enabled }, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: ResourceKey[] = extractResourceKeys(registries);
	record.legacySession.setDevMode(enabled);
	replaceLegacySessionCaches(record, registries, resourceKeys);
	return {
		session: record.handle,
		legacySession: record.legacySession,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries,
		resourceKeys,
		metadata: response.snapshot.metadata,
	};
}

export async function updateSessionPlayerName(
	request: SessionUpdatePlayerNameRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<FetchSnapshotResult> {
	const api = ensureGameApi();
	const record = getLegacySessionRecord(request.sessionId);
	const response: SessionUpdatePlayerNameResponse = await api.updatePlayerName(
		request,
		requestOptions,
	);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: ResourceKey[] = extractResourceKeys(registries);
	replaceLegacySessionCaches(record, registries, resourceKeys);
	const player = response.snapshot.game.players.find(
		(entry) => entry.id === request.playerId,
	);
	const sanitizedName = player?.name ?? request.playerName;
	record.legacySession.updatePlayerName(request.playerId, sanitizedName);
	return {
		session: record.handle,
		legacySession: record.legacySession,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries,
		resourceKeys,
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
	const { handle } = getLegacySessionRecord(request.sessionId);
	try {
		const response = await api.performAction(request, requestOptions);
		if (response.status === 'success') {
			try {
				const params = request.params;
				await handle.enqueue(() => {
					handle.performAction(request.actionId, params);
				});
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
	const record = getLegacySessionRecord(request.sessionId);
	const response = await api.advancePhase(request, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: ResourceKey[] = extractResourceKeys(registries);
	mergeLegacySessionCaches(record, registries, resourceKeys);
	try {
		await record.handle.enqueue(() => {
			record.handle.advancePhase();
		});
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
	releaseLegacySession(sessionId);
}

export type { CreateSessionResult, FetchSnapshotResult, SessionHandle };
export { SessionMirroringError, markFatalSessionError };
export { isFatalSessionError } from './legacySessionMirror';
