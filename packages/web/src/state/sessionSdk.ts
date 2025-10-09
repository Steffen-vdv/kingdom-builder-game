import {
	BuildingId,
	GAME_START,
	PHASES,
	POPULATIONS,
	RULES,
} from '@kingdom-builder/contents';
import {
	createEngineSession,
	type EngineSession,
	type EngineSessionSnapshot,
	type RuleSnapshot,
} from '@kingdom-builder/engine';
import type {
	ActionExecuteErrorResponse,
	ActionExecuteRequest,
	ActionExecuteResponse,
	ActionExecuteSuccessResponse,
	SessionActionRequirementList,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol';
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

interface FetchSnapshotResult {
	session: EngineSession;
	snapshot: EngineSessionSnapshot;
	ruleSnapshot: RuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
}

interface PerformActionOptions extends ActionExecuteRequest {}

interface AdvancePhaseOptions extends SessionAdvanceRequest {}

function isSessionRequirementFailure(
	value: unknown,
): value is SessionRequirementFailure {
	return Boolean(value && typeof value === 'object');
}

function isSessionRequirementFailureList(
	value: unknown,
): value is SessionActionRequirementList {
	if (!Array.isArray(value)) {
		return false;
	}
	return value.every(isSessionRequirementFailure);
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

export async function performSessionAction(
	options: PerformActionOptions,
): Promise<ActionExecuteResponse> {
	const session = ensureSession(options.sessionId);
	try {
		const { snapshot, traces } = await session.enqueue(() => {
			const runTraces = session.performAction(options.actionId, options.params);
			return {
				traces: runTraces,
				snapshot: session.getSnapshot(),
			};
		});
		const response: ActionExecuteSuccessResponse = {
			status: 'success',
			snapshot,
			traces,
		};
		return response;
	} catch (error) {
		const requirementFailure = (
			error as {
				requirementFailure?: unknown;
			}
		).requirementFailure;
		const requirementFailures = (
			error as {
				requirementFailures?: unknown;
			}
		).requirementFailures;
		const message = (error as Error).message || 'Action failed.';
		const errorResponse: ActionExecuteErrorResponse = {
			status: 'error',
			error: message,
		};
		if (isSessionRequirementFailure(requirementFailure)) {
			errorResponse.requirementFailure = requirementFailure;
		}
		if (isSessionRequirementFailureList(requirementFailures)) {
			errorResponse.requirementFailures = requirementFailures;
		}
		return errorResponse;
	}
}

export async function advanceSessionPhase(
	options: AdvancePhaseOptions,
): Promise<SessionAdvanceResponse> {
	const session = ensureSession(options.sessionId);
	const { advance, snapshot } = await session.enqueue(() => {
		const result = session.advancePhase();
		return {
			advance: result,
			snapshot: session.getSnapshot(),
		};
	});
	return {
		sessionId: options.sessionId,
		snapshot,
		advance,
	};
}

export function releaseSession(sessionId: string): void {
	if (!sessions.has(sessionId)) {
		return;
	}
	sessions.delete(sessionId);
}

export type { CreateSessionResult, FetchSnapshotResult };
