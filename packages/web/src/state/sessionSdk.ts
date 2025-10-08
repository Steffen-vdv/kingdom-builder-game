import {
	createEngineSession,
	type EngineSession,
	type EngineSessionSnapshot,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	GAME_START,
	PHASES,
	POPULATIONS,
	RESOURCES,
	RULES,
	BuildingId,
	type ResourceKey,
} from '@kingdom-builder/contents';
import { initializeDeveloperMode } from './developerModeSetup';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import type { SessionRegistries } from './sessionSelectors.types';

type SessionId = string;

interface SessionRecord {
	session: EngineSession;
}

const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];
const CONTENT_REGISTRIES = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
} as const;
const REGISTRIES: SessionRegistries = {
	actions: CONTENT_REGISTRIES.actions,
	buildings: CONTENT_REGISTRIES.buildings,
	developments: CONTENT_REGISTRIES.developments,
};

const sessions = new Map<SessionId, SessionRecord>();

const createSessionId = () => {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `session-${Math.random().toString(16).slice(2)}`;
};

export interface CreateSessionOptions {
	devMode?: boolean;
	playerName?: string;
}

export interface CreateSessionResult {
	sessionId: SessionId;
	session: EngineSession;
	snapshot: EngineSessionSnapshot;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
	contentRegistries: typeof CONTENT_REGISTRIES;
}

export function createSession(
	options: CreateSessionOptions = {},
): Promise<CreateSessionResult> {
	const session = createEngineSession({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
		devMode: options.devMode ?? false,
	});
	session.setDevMode(options.devMode ?? false);
	let snapshot = session.getSnapshot();
	const primaryPlayer = snapshot.game.players[0];
	const primaryPlayerId = primaryPlayer?.id;
	const hasMill = primaryPlayer?.buildings.includes(BuildingId.Mill) ?? false;
	if (
		options.devMode &&
		primaryPlayerId &&
		snapshot.game.turn === 1 &&
		!hasMill
	) {
		initializeDeveloperMode(session, primaryPlayerId);
		snapshot = session.getSnapshot();
	}
	const desiredName = options.playerName ?? DEFAULT_PLAYER_NAME;
	if (primaryPlayerId) {
		session.updatePlayerName(primaryPlayerId, desiredName);
		snapshot = session.getSnapshot();
	}
	const sessionId = createSessionId();
	sessions.set(sessionId, { session });
	return Promise.resolve({
		sessionId,
		session,
		snapshot,
		registries: REGISTRIES,
		resourceKeys: RESOURCE_KEYS,
		contentRegistries: CONTENT_REGISTRIES,
	});
}

export interface FetchSnapshotResult {
	sessionId: SessionId;
	snapshot: EngineSessionSnapshot;
}

export function fetchSnapshot(
	sessionId: SessionId,
): Promise<FetchSnapshotResult> {
	const record = sessions.get(sessionId);
	if (!record) {
		return Promise.reject(new Error('Unknown session.'));
	}
	return Promise.resolve({
		sessionId,
		snapshot: record.session.getSnapshot(),
	});
}

export function releaseSession(sessionId: SessionId): Promise<void> {
	if (!sessions.has(sessionId)) {
		return Promise.resolve();
	}
	sessions.delete(sessionId);
	return Promise.resolve();
}

export type { EngineSession, EngineSessionSnapshot };
export type { ResourceKey };
export type ContentRegistries = typeof CONTENT_REGISTRIES;
export { RESOURCE_KEYS, REGISTRIES, CONTENT_REGISTRIES };
