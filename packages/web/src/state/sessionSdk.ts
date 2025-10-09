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
	ActionExecuteSuccessResponse,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
} from '@kingdom-builder/protocol/session';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import { initializeDeveloperMode } from './developerModeSetup';
import {
	RESOURCE_KEYS,
	SESSION_REGISTRIES,
	type ResourceKey,
	type SessionRegistries,
} from './sessionContent';

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
}

const SESSION_PREFIX = 'local-session-';

const sessions = new Map<string, SessionRecord>();

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

export function createSession(
	options: CreateSessionOptions = {},
): Promise<CreateSessionResult> {
	const devMode = options.devMode ?? false;
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
	applyPlayerName(session, initialSnapshot, options.playerName);
	const snapshot = session.getSnapshot();
	const ruleSnapshot = session.getRuleSnapshot();
	const sessionId = `${SESSION_PREFIX}${nextSessionId++}`;
	sessions.set(sessionId, { session });
	return Promise.resolve({
		sessionId,
		session,
		snapshot,
		ruleSnapshot,
		registries: SESSION_REGISTRIES,
		resourceKeys: RESOURCE_KEYS,
	});
}

export function fetchSnapshot(sessionId: string): Promise<FetchSnapshotResult> {
	const session = ensureSession(sessionId);
	return Promise.resolve({
		session,
		snapshot: session.getSnapshot(),
		ruleSnapshot: session.getRuleSnapshot(),
		registries: SESSION_REGISTRIES,
		resourceKeys: RESOURCE_KEYS,
	});
}

export function performSessionAction(
	request: ActionExecuteRequest,
): Promise<ActionExecuteResponse> {
	const session = ensureSession(request.sessionId);
	try {
		const traces = session.performAction(
			request.actionId,
			request.params as ActionParams<string> | undefined,
		);
		const response: ActionExecuteSuccessResponse = {
			status: 'success',
			snapshot: session.getSnapshot(),
			traces,
		};
		return Promise.resolve(response);
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
		return Promise.resolve(response);
	}
}

export function advanceSessionPhase(
	request: SessionAdvanceRequest,
): Promise<SessionAdvanceResponse> {
	const session = ensureSession(request.sessionId);
	const advance = session.advancePhase();
	return Promise.resolve({
		sessionId: request.sessionId,
		snapshot: session.getSnapshot(),
		advance,
	} satisfies SessionAdvanceResponse);
}

export function releaseSession(sessionId: string): void {
	if (!sessions.has(sessionId)) {
		return;
	}
	sessions.delete(sessionId);
}

export type { CreateSessionResult, FetchSnapshotResult };
