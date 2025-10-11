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
import { createGameApi, type GameApi } from '../services/gameApi';
import { loadRuntimeConfig } from '../startup/runtimeConfig';
import {
	buildStartConfigFromSnapshot,
	mergeRuleSnapshot,
	mergeStartConfigs,
	resolvePhaseConfig,
} from './sessionBootstrap';
import type { SessionResourceKey } from './sessionTypes';

export interface SessionHandle {
	enqueue: EngineSession['enqueue'];
	advancePhase: EngineSession['advancePhase'];
	performAction: EngineSession['performAction'];
}

interface SessionRecord {
	handle: SessionHandle;
	legacySession: EngineSession;
	registries: SessionRegistries;
	resourceKeys: SessionResourceKey[];
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
	resourceKeys: SessionResourceKey[];
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
	resourceKeys: SessionResourceKey[];
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
	const primaryPlayer = snapshot.game.players[0];
	const primaryPlayerId = primaryPlayer?.id;
	if (!primaryPlayerId || snapshot.game.turn !== 1) {
		return;
	}
	initializeDeveloperMode(session, primaryPlayerId, {
		registries,
		rules: snapshot.rules,
	});
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

export async function createSession(
	options: CreateSessionOptions = {},
): Promise<CreateSessionResult> {
	const devMode = options.devMode ?? false;
	const playerName = options.playerName ?? DEFAULT_PLAYER_NAME;
	const sessionRequest: SessionCreateRequest = {
		devMode,
		playerNames: { A: playerName },
	};
	const api = ensureGameApi();
	const response = await api.createSession(sessionRequest);
	const runtimeConfig = await loadRuntimeConfig();
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: SessionResourceKey[] = extractResourceKeys(registries);
	const startFromSnapshot = buildStartConfigFromSnapshot(response.snapshot);
	const startConfig = mergeStartConfigs(runtimeConfig.start, startFromSnapshot);
	const phases = resolvePhaseConfig(
		response.snapshot.phases,
		runtimeConfig.phases,
	);
	const rules = mergeRuleSnapshot(response.snapshot.rules, runtimeConfig.rules);
	const legacySession = createEngineSession({
		actions: registries.actions,
		buildings: registries.buildings,
		developments: registries.developments,
		populations: registries.populations,
		phases,
		start: startConfig,
		rules,
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

export async function fetchSnapshot(
	sessionId: string,
): Promise<FetchSnapshotResult> {
	const api = ensureGameApi();
	const record = ensureSessionRecord(sessionId);
	const response = await api.fetchSnapshot(sessionId);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: SessionResourceKey[] = extractResourceKeys(registries);
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

export async function performSessionAction(
	request: ActionExecuteRequest,
): Promise<ActionExecuteResponse> {
	const api = ensureGameApi();
	const { handle } = ensureSessionRecord(request.sessionId);
	try {
		const response = await api.performAction(request);
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

export async function advanceSessionPhase(
	request: SessionAdvanceRequest,
): Promise<SessionAdvanceResponse> {
	const api = ensureGameApi();
	const record = ensureSessionRecord(request.sessionId);
	const {
		handle,
		registries: cachedRegistries,
		resourceKeys: cachedResourceKeys,
	} = record;
	const response = await api.advancePhase(request);
	const registries = deserializeSessionRegistries(response.registries);
	const resourceKeys: SessionResourceKey[] = extractResourceKeys(registries);
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
