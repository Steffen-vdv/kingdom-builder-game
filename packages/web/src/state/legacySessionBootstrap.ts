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
	deserializeSessionRegistries,
	extractResourceKeys,
	type SessionRegistries,
} from './sessionRegistries';
import {
	initializeDeveloperMode,
	type DeveloperModeOptions,
} from './developerModeSetup';
import { getLegacyContentConfig } from '../startup/runtimeConfig';

export type ResourceKey = string;

export interface LegacySessionBootstrapOptions {
	sessionId: string;
	devMode: boolean;
	playerName?: string;
	registries: SessionRegistriesPayload;
}

export interface LegacySessionBootstrapResult {
	session: EngineSession;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
}

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

export async function createLegacySession(
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
	return { session: legacySession, registries, resourceKeys };
}
