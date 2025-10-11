import {
	createEngineSession,
	type ActionParams,
	type EngineSession,
} from '@kingdom-builder/engine';
import type {
	ActionExecuteErrorResponse,
	ActionExecuteRequest,
	ActionExecuteResponse,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
} from '@kingdom-builder/protocol/session';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import { initializeDeveloperMode } from './developerModeSetup';
import {
	deserializeSessionRegistries,
	extractResourceKeys,
	type SessionRegistries,
} from './sessionRegistries';
import {
	createGameApi,
	type GameApi,
	type GameApiRequestOptions,
} from '../services/gameApi';
import {
	getEngineBootstrapOptions,
	getRuntimeConfig,
	loadRuntimeConfig,
} from '../runtime/config';

export interface SessionHandle {
	enqueue: EngineSession['enqueue'];
	advancePhase: EngineSession['advancePhase'];
	performAction: EngineSession['performAction'];
}

interface SessionRecord {
	handle: SessionHandle;
	legacySession: EngineSession;
	registries: SessionRegistries;
	resourceKeys: string[];
}

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
	resourceKeys: string[];
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
	resourceKeys: string[];
	metadata: SessionSnapshotMetadata;
}

const SESSION_PREFIX = 'local-session-';

const sessions = new Map<string, SessionRecord>();

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

let nextSessionId = 1;

function ensureSessionRecord(sessionId: string): SessionRecord {
	const record = sessions.get(sessionId);
	if (!record) {
		throw new Error(`Session not found: ${sessionId}`);
	}
	return record;
}

function createSessionHandle(session: EngineSession): SessionHandle {
	return {
		enqueue: session.enqueue.bind(session),
		advancePhase: session.advancePhase.bind(session),
		performAction: session.performAction.bind(session),
	};
}

function applyDeveloperPreset(
	session: EngineSession,
	snapshot: SessionSnapshot,
	registries: SessionRegistries,
	devMode: boolean,
): void {
	if (!devMode) {
		return;
	}
	const runtimeConfig = getRuntimeConfig();
	const preset = runtimeConfig.developerPreset;
	if (!preset) {
		return;
	}
	const primaryPlayer = snapshot.game.players[0];
	const primaryPlayerId = primaryPlayer?.id;
	if (!primaryPlayerId || snapshot.game.turn !== 1) {
		return;
	}
	const skipId = preset.skipIfBuildingPresent;
	if (skipId && primaryPlayer?.buildings.includes(skipId)) {
		return;
	}
	initializeDeveloperMode(session, primaryPlayerId, registries, preset);
}

function applyPlayerName(
	session: EngineSession,
	snapshot: SessionSnapshot,
	name?: string,
): void {
	const desiredName = name ?? DEFAULT_PLAYER_NAME;
	const primaryPlayer = snapshot.game.players[0];
	const primaryPlayerId = primaryPlayer?.id;
	if (!primaryPlayerId) {
		return;
	}
	session.updatePlayerName(primaryPlayerId, desiredName);
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
	await loadRuntimeConfig();
	const engineOptions = getEngineBootstrapOptions();
	const devMode = options.devMode ?? false;
	const playerName = options.playerName ?? DEFAULT_PLAYER_NAME;
	const sessionRequest: SessionCreateRequest = {
		devMode,
		playerNames: { A: playerName },
	};
	const api = ensureGameApi();
	const response = await api.createSession(sessionRequest, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys = extractResourceKeys(registries);
	const legacySession = createEngineSession({
		actions: registries.actions,
		buildings: registries.buildings,
		developments: registries.developments,
		populations: registries.populations,
		phases: engineOptions.phases,
		start: engineOptions.start,
		rules: engineOptions.rules,
		devMode,
	});
	legacySession.setDevMode(devMode);
	const initialSnapshot = legacySession.getSnapshot();
	applyDeveloperPreset(legacySession, initialSnapshot, registries, devMode);
	applyPlayerName(legacySession, initialSnapshot, playerName);
	const sessionId = response.sessionId ?? `${SESSION_PREFIX}${nextSessionId++}`;
	const handle = createSessionHandle(legacySession);
	sessions.set(sessionId, { handle, legacySession, registries, resourceKeys });
	return {
		sessionId,
		session: handle,
		legacySession,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries,
		resourceKeys,
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
	const record = ensureSessionRecord(sessionId);
	const response = await api.fetchSnapshot(sessionId, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys = extractResourceKeys(registries);
	record.registries = registries;
	record.resourceKeys = resourceKeys;
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
	const { handle } = ensureSessionRecord(request.sessionId);
	try {
		const response = await api.performAction(request, requestOptions);
		if (response.status === 'success') {
			try {
				const params = request.params as ActionParams<string> | undefined;
				handle.performAction(request.actionId, params);
			} catch (localError) {
				console.error(
					'Local session failed to mirror remote action.',
					localError,
				);
			}
		}
		return response;
	} catch (error) {
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
	const record = ensureSessionRecord(request.sessionId);
	const {
		handle,
		registries: cachedRegistries,
		resourceKeys: cachedResourceKeys,
	} = record;
	const response = await api.advancePhase(request, requestOptions);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys = extractResourceKeys(registries);
	Object.assign(cachedRegistries, registries);
	cachedResourceKeys.splice(0, cachedResourceKeys.length, ...resourceKeys);
	try {
		handle.advancePhase();
	} catch (localError) {
		console.error('Local session failed to mirror remote advance.', localError);
	}
	return response;
}

export function releaseSession(sessionId: string): void {
	sessions.delete(sessionId);
}
export type { CreateSessionResult, FetchSnapshotResult };
