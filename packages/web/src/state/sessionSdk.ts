import {
	BuildingId,
	GAME_START,
	PHASES,
	POPULATIONS,
	RULES,
} from '@kingdom-builder/contents';
import {
	createEngineSession,
	type ActionParams,
	type EngineSession,
	type EngineSessionSnapshot,
	type RuleSnapshot,
} from '@kingdom-builder/engine';
import type {
	ActionExecuteErrorResponse,
	ActionExecuteRequest,
	ActionExecuteResponse,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
} from '@kingdom-builder/protocol/session';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import { initializeDeveloperMode } from './developerModeSetup';
import {
	RESOURCE_KEYS,
	SESSION_REGISTRIES,
	type ResourceKey,
	type SessionRegistries,
} from './sessionContent';
import { createGameApi, type GameApi } from '../services/gameApi';

interface SessionRecord {
	session: EngineSession;
}

interface CreateSessionOptions {
	devMode?: boolean;
	playerName?: string;
}

interface CreateSessionResult {
	sessionId: string;
	session: EngineSession;
	snapshot: EngineSessionSnapshot;
	ruleSnapshot: RuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
	metadata: EngineSessionSnapshot['metadata'];
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
	session: EngineSession;
	snapshot: EngineSessionSnapshot;
	ruleSnapshot: RuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
	metadata: EngineSessionSnapshot['metadata'];
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

function ensureSession(sessionId: string): EngineSession {
	const record = sessions.get(sessionId);
	if (!record) {
		throw new Error(`Session not found: ${sessionId}`);
	}
	return record.session;
}

function applyDeveloperPreset(
	session: EngineSession,
	snapshot: EngineSessionSnapshot,
	devMode: boolean,
): void {
	if (!devMode) {
		return;
	}
	const primaryPlayer = snapshot.game.players[0];
	const primaryPlayerId = primaryPlayer?.id;
	const hasMill = primaryPlayer?.buildings.includes(BuildingId.Mill) ?? false;
	if (!primaryPlayerId || snapshot.game.turn !== 1 || hasMill) {
		return;
	}
	initializeDeveloperMode(session, primaryPlayerId);
}

function applyPlayerName(
	session: EngineSession,
	snapshot: EngineSessionSnapshot,
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
	const session = createEngineSession({
		actions: SESSION_REGISTRIES.actions,
		buildings: SESSION_REGISTRIES.buildings,
		developments: SESSION_REGISTRIES.developments,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
		devMode,
	});
	session.setDevMode(devMode);
	const initialSnapshot = session.getSnapshot();
	applyDeveloperPreset(session, initialSnapshot, devMode);
	applyPlayerName(session, initialSnapshot, playerName);
	const sessionId = response.sessionId ?? `${SESSION_PREFIX}${nextSessionId++}`;
	sessions.set(sessionId, { session });
	return {
		sessionId,
		session,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries: SESSION_REGISTRIES,
		resourceKeys: RESOURCE_KEYS,
		metadata: response.snapshot.metadata,
	};
}

export async function fetchSnapshot(
	sessionId: string,
): Promise<FetchSnapshotResult> {
	const api = ensureGameApi();
	const session = ensureSession(sessionId);
	const response = await api.fetchSnapshot(sessionId);
	return {
		session,
		snapshot: response.snapshot,
		ruleSnapshot: response.snapshot.rules,
		registries: SESSION_REGISTRIES,
		resourceKeys: RESOURCE_KEYS,
		metadata: response.snapshot.metadata,
	};
}

export async function performSessionAction(
	request: ActionExecuteRequest,
): Promise<ActionExecuteResponse> {
	const api = ensureGameApi();
	const session = ensureSession(request.sessionId);
	try {
		const response = await api.performAction(request);
		if (response.status === 'success') {
			try {
				session.performAction(
					request.actionId,
					request.params as ActionParams<string> | undefined,
				);
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
	const session = ensureSession(request.sessionId);
	const response = await api.advancePhase(request);
	try {
		session.advancePhase();
	} catch (localError) {
		console.error('Local session failed to mirror remote advance.', localError);
	}
	return response;
}

export function releaseSession(sessionId: string): void {
	if (!sessions.has(sessionId)) {
		return;
	}
	sessions.delete(sessionId);
}

export type { CreateSessionResult, FetchSnapshotResult };
