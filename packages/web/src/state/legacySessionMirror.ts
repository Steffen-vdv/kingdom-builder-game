import {
	createEngineSession,
	type EngineSession,
} from '@kingdom-builder/engine';
import type {
	SessionRegistriesPayload,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import {
	initializeDeveloperMode,
	type DeveloperModeOptions,
} from './developerModeSetup';
import {
	deserializeSessionRegistries,
	extractResourceKeys,
	type SessionRegistries,
} from './sessionRegistries';
import { getLegacyContentConfig } from '../startup/runtimeConfig';

interface SessionMirroringErrorOptions {
	cause: unknown;
	details?: Record<string, unknown>;
}

const fatalSessionErrorFlag = Symbol('session:fatal-error');

/**
 * Handles mirroring failures when applying remote responses to the local engine
 * session.
 */
export class SessionMirroringError extends Error {
	public override readonly cause: unknown;

	public readonly details: Record<string, unknown>;

	public constructor(
		message: string,
		{ cause, details = {} }: SessionMirroringErrorOptions,
	) {
		super(message);
		this.name = 'SessionMirroringError';
		this.cause = cause;
		this.details = details;
	}
}

export function markFatalSessionError(error: unknown): void {
	if (error === null || typeof error !== 'object') {
		return;
	}
	Reflect.set(
		error as Record<PropertyKey, unknown>,
		fatalSessionErrorFlag,
		true,
	);
}

export function isFatalSessionError(error: unknown): boolean {
	if (error === null || typeof error !== 'object') {
		return false;
	}
	return Boolean(
		Reflect.get(error as Record<PropertyKey, unknown>, fatalSessionErrorFlag),
	);
}

export interface SessionHandle {
	enqueue: EngineSession['enqueue'];
	advancePhase: EngineSession['advancePhase'];
	performAction: EngineSession['performAction'];
}

export interface LegacySessionRecord {
	handle: SessionHandle;
	legacySession: EngineSession;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
}

export type ResourceKey = string;

const SESSION_PREFIX = 'local-session-';

const sessions = new Map<string, LegacySessionRecord>();

let nextSessionId = 1;

let legacyContentPromise: Promise<
	Awaited<ReturnType<typeof getLegacyContentConfig>>
> | null = null;

async function ensureLegacyContentConfig(): Promise<
	Awaited<ReturnType<typeof getLegacyContentConfig>>
> {
	if (!legacyContentPromise) {
		legacyContentPromise = getLegacyContentConfig();
	}
	return legacyContentPromise;
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
	devMode: boolean,
	options: DeveloperModeOptions,
): void {
	if (!devMode) {
		return;
	}
	const primaryPlayer = snapshot.game.players[0];
	const primaryPlayerId = primaryPlayer?.id;
	if (!primaryPlayerId || snapshot.game.turn !== 1) {
		return;
	}
	initializeDeveloperMode(session, primaryPlayerId, options);
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

export interface LegacySessionBootstrapOptions {
	sessionId?: string;
	devMode: boolean;
	playerName?: string;
	registries: SessionRegistriesPayload;
}

export interface LegacySessionBootstrapResult {
	sessionId: string;
	session: SessionHandle;
	legacySession: EngineSession;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
}

/**
 * Creates an Engine-backed session mirror for the remote response and caches it
 * for future synchronization.
 *
 * TODO(domain-migration): Replace this legacy Engine mirror when the protocol
 * session pipeline streams authoritative snapshots directly to the client.
 * Downstream modules should call the new pipeline once available and remove the
 * transitional helpers exported here.
 */
export async function createLegacySessionMirror(
	options: LegacySessionBootstrapOptions,
): Promise<LegacySessionBootstrapResult> {
	const { devMode, registries: payload } = options;
	const registries = deserializeSessionRegistries(payload);
	const contentConfig = await ensureLegacyContentConfig();
	const resourceKeys: ResourceKey[] = extractResourceKeys(registries);
	const legacySession = createEngineSession({
		actions: registries.actions,
		buildings: registries.buildings,
		developments: registries.developments,
		populations: registries.populations,
		phases: contentConfig.phases,
		start: contentConfig.start,
		rules: contentConfig.rules,
		devMode,
	});
	legacySession.setDevMode(devMode);
	const initialSnapshot = legacySession.getSnapshot();
	const developerOptions: DeveloperModeOptions = { registries };
	if (contentConfig.developerPreset) {
		developerOptions.preset = contentConfig.developerPreset;
	}
	applyDeveloperPreset(
		legacySession,
		initialSnapshot,
		devMode,
		developerOptions,
	);
	applyPlayerName(legacySession, initialSnapshot, options.playerName);
	const sessionId = options.sessionId ?? `${SESSION_PREFIX}${nextSessionId++}`;
	const session = createSessionHandle(legacySession);
	const record: LegacySessionRecord = {
		handle: session,
		legacySession,
		registries,
		resourceKeys,
	};
	sessions.set(sessionId, record);
	return { sessionId, session, legacySession, registries, resourceKeys };
}

export function getLegacySessionRecord(sessionId: string): LegacySessionRecord {
	const record = sessions.get(sessionId);
	if (!record) {
		const error = new Error(`Session not found: ${sessionId}`);
		markFatalSessionError(error);
		throw error;
	}
	return record;
}

export function replaceLegacySessionCaches(
	record: LegacySessionRecord,
	registries: SessionRegistries,
	resourceKeys: ResourceKey[],
): void {
	record.registries = registries;
	record.resourceKeys = resourceKeys;
}

export function mergeLegacySessionCaches(
	record: LegacySessionRecord,
	registries: SessionRegistries,
	resourceKeys: ResourceKey[],
): void {
	Object.assign(record.registries, registries);
	record.resourceKeys.splice(0, record.resourceKeys.length, ...resourceKeys);
}

export function releaseLegacySession(sessionId: string): void {
	sessions.delete(sessionId);
}
