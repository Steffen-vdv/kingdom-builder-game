import {
	createEngineSession,
	type EngineSession,
} from '@kingdom-builder/engine';
import type {
	SessionRegistriesMetadata,
	SessionRegistriesPayload,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import {
	createRemoteSessionQueue,
	type RemoteSessionQueue,
	type RemoteSessionQueueSnapshot,
	type RemoteSessionQueueOptions,
} from './RemoteSessionQueue';
import {
	initializeDeveloperMode,
	type DeveloperModeOptions,
} from './developerModeSetup';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import type { SessionRegistries } from './sessionRegistries';
import { getLegacyContentConfig } from '../startup/runtimeConfig';

export interface SessionHandle {
	enqueue: EngineSession['enqueue'];
	advancePhase: EngineSession['advancePhase'];
	performAction: EngineSession['performAction'];
	getLatestSnapshot(): SessionSnapshot | null;
	getLatestRegistries(): SessionRegistries | null;
	getLatestMetadata(): SessionSnapshot['metadata'] | null;
	getLatestRegistriesMetadata(): SessionRegistriesMetadata | undefined;
}

export interface SessionRecord {
	sessionId: string;
	handle: SessionHandle;
	legacySession: EngineSession;
	queue: RemoteSessionQueue;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
}

export interface SessionBootstrapOptions {
	sessionId?: string;
	snapshot: SessionSnapshot;
	registriesPayload: SessionRegistriesPayload;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
	devMode: boolean;
	playerName?: string;
}

export type ResourceKey = string;

interface SessionMirroringErrorOptions {
	cause: unknown;
	details?: Record<string, unknown>;
}

const fatalSessionErrorFlag = Symbol('session:fatal-error');
const SESSION_PREFIX = 'local-session-';

const sessions = new Map<string, SessionRecord>();

let nextSessionId = 1;

let legacyContentPromise: Promise<
	Awaited<ReturnType<typeof getLegacyContentConfig>>
> | null = null;

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

async function ensureLegacyContentConfig(): Promise<
	Awaited<ReturnType<typeof getLegacyContentConfig>>
> {
	if (!legacyContentPromise) {
		legacyContentPromise = getLegacyContentConfig();
	}
	return legacyContentPromise;
}

function createSessionHandle(
	session: EngineSession,
	queue: RemoteSessionQueue,
): SessionHandle {
	return {
		enqueue: session.enqueue.bind(session),
		advancePhase: session.advancePhase.bind(session),
		performAction: session.performAction.bind(session),
		getLatestSnapshot: () => queue.getLatestSnapshot(),
		getLatestRegistries: () => queue.getLatestRegistries(),
		getLatestMetadata: () => queue.getLatestMetadata(),
		getLatestRegistriesMetadata: () => queue.getLatestRegistriesMetadata(),
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

export async function createSessionRecord(
	options: SessionBootstrapOptions,
): Promise<SessionRecord> {
	const contentConfig = await ensureLegacyContentConfig();
	const legacySession = createEngineSession({
		actions: options.registries.actions,
		buildings: options.registries.buildings,
		developments: options.registries.developments,
		populations: options.registries.populations,
		phases: contentConfig.phases,
		start: contentConfig.start,
		rules: contentConfig.rules,
		devMode: options.devMode,
	});
	legacySession.setDevMode(options.devMode);
	const initialSnapshot = legacySession.getSnapshot();
	const developerOptions: DeveloperModeOptions = {
		registries: options.registries,
	};
	if (contentConfig.developerPreset) {
		developerOptions.preset = contentConfig.developerPreset;
	}
	applyDeveloperPreset(
		legacySession,
		initialSnapshot,
		options.devMode,
		developerOptions,
	);
	applyPlayerName(legacySession, initialSnapshot, options.playerName);
	const sessionId = options.sessionId ?? `${SESSION_PREFIX}${nextSessionId++}`;
	const queueOptions = {
		sessionId,
		snapshot: options.snapshot,
		registries: options.registries,
		metadata: options.snapshot.metadata,
	} as RemoteSessionQueueOptions;
	if (options.registriesPayload.metadata !== undefined) {
		queueOptions.registriesMetadata = options.registriesPayload.metadata;
	}
	const queue = createRemoteSessionQueue(queueOptions);
	const handle = createSessionHandle(legacySession, queue);
	const record: SessionRecord = {
		sessionId,
		handle,
		legacySession,
		queue,
		registries: options.registries,
		resourceKeys: options.resourceKeys,
	};
	sessions.set(sessionId, record);
	return record;
}

export function getSessionRecord(sessionId: string): SessionRecord {
	const record = sessions.get(sessionId);
	if (!record) {
		const error = new Error(`Session not found: ${sessionId}`);
		markFatalSessionError(error);
		throw error;
	}
	return record;
}

function updateQueueState(
	record: SessionRecord,
	snapshot: SessionSnapshot,
	registries: SessionRegistries,
	registriesMetadata?: SessionRegistriesMetadata,
): void {
	const state: RemoteSessionQueueSnapshot = {
		snapshot,
		registries,
		metadata: snapshot.metadata,
	};
	if (registriesMetadata !== undefined) {
		state.registriesMetadata = registriesMetadata;
	}
	record.queue.updateState(state);
}

export function replaceSessionCaches(
	record: SessionRecord,
	registries: SessionRegistries,
	resourceKeys: ResourceKey[],
	snapshot: SessionSnapshot,
	registriesMetadata?: SessionRegistriesMetadata,
): void {
	record.registries = registries;
	record.resourceKeys = resourceKeys;
	updateQueueState(record, snapshot, registries, registriesMetadata);
}

export function mergeSessionCaches(
	record: SessionRecord,
	registries: SessionRegistries,
	resourceKeys: ResourceKey[],
	snapshot: SessionSnapshot,
	registriesMetadata?: SessionRegistriesMetadata,
): void {
	Object.assign(record.registries, registries);
	record.resourceKeys.splice(0, record.resourceKeys.length, ...resourceKeys);
	updateQueueState(record, snapshot, record.registries, registriesMetadata);
}

export function releaseSessionRecord(sessionId: string): void {
	sessions.delete(sessionId);
}
