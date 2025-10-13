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
	extractResourceKeys,
	type SessionRegistries,
} from './sessionRegistries';
import {
	createSessionRecord,
	getSessionRecord,
	mergeSessionCaches,
	replaceSessionCaches,
	releaseSessionRecord,
	SessionMirroringError,
	markFatalSessionError,
	isFatalSessionError,
	type SessionHandle,
	type ResourceKey,
} from './sessionRecords';
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
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: ResourceKey[] = extractResourceKeys(registries);
	const record = await createSessionRecord({
		sessionId: response.sessionId,
		snapshot: response.snapshot,
		registriesPayload: response.registries,
		registries,
		resourceKeys,
		devMode,
		playerName,
	});
	return {
		sessionId: record.sessionId,
		session: record.handle,
		legacySession: record.legacySession,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries: record.registries,
		resourceKeys: record.resourceKeys,
		metadata: response.snapshot.metadata,
	};
}

export async function fetchSnapshot(
	sessionId: string,
	requestOptions: GameApiRequestOptions = {},
): Promise<FetchSnapshotResult> {
	const api = ensureGameApi();
	const record = getSessionRecord(sessionId);
	const response = await api.fetchSnapshot(sessionId, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: ResourceKey[] = extractResourceKeys(registries);
	replaceSessionCaches(
		record,
		registries,
		resourceKeys,
		response.snapshot,
		response.registries.metadata,
	);
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
	const record = getSessionRecord(sessionId);
	const response = await api.setDevMode({ sessionId, enabled }, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: ResourceKey[] = extractResourceKeys(registries);
	record.legacySession.setDevMode(enabled);
	replaceSessionCaches(
		record,
		registries,
		resourceKeys,
		response.snapshot,
		response.registries.metadata,
	);
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
	const record = getSessionRecord(request.sessionId);
	const response = await api.updatePlayerName(request, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: ResourceKey[] = extractResourceKeys(registries);
	replaceSessionCaches(
		record,
		registries,
		resourceKeys,
		response.snapshot,
		response.registries.metadata,
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
		resourceKeys,
		metadata: response.snapshot.metadata,
	};
}

export async function performSessionAction(
	request: ActionExecuteRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<ActionExecuteResponse> {
	const api = ensureGameApi();
	const record = getSessionRecord(request.sessionId);
	try {
		const response = await api.performAction(request, requestOptions);
		if (response.status === 'success') {
			record.queue.updateSnapshot(response.snapshot);
			try {
				const params = request.params;
				await record.handle.enqueue(() => {
					record.handle.performAction(request.actionId, params);
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

export async function advanceSessionPhase(
	request: SessionAdvanceRequest,
	requestOptions: GameApiRequestOptions = {},
): Promise<SessionAdvanceResponse> {
	const api = ensureGameApi();
	const record = getSessionRecord(request.sessionId);
	const response = await api.advancePhase(request, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: ResourceKey[] = extractResourceKeys(registries);
	mergeSessionCaches(
		record,
		registries,
		resourceKeys,
		response.snapshot,
		response.registries.metadata,
	);
	try {
		await record.handle.enqueue(() => {
			record.handle.advancePhase();
		});
	} catch (localError) {
		const error = new SessionMirroringError(
			'Local session failed to mirror remote phase advance.',
			{
				cause: localError,
				details: { sessionId: request.sessionId },
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
