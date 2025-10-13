import type {
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { type CreateSessionResult } from './sessionSdk';

export type Session = CreateSessionResult['session'];
export type LegacySession = CreateSessionResult['legacySession'];
export type SessionRegistries = CreateSessionResult['registries'];
export type SessionResourceKeys = CreateSessionResult['resourceKeys'];
export type SessionResourceKey = SessionResourceKeys[number];
export type SessionMetadata = SessionSnapshotMetadata;

export type { SessionRuleSnapshot, SessionSnapshot };

export interface SessionQueueHelpers {
	enqueue<T>(task: () => Promise<T> | T): Promise<T>;
	getLatestSnapshot: () => SessionSnapshot | null;
	getLatestRegistries: () => SessionRegistries | null;
	getLatestMetadata: () => SessionMetadata | null;
	updatePlayerName: (playerId: string, playerName: string) => Promise<void>;
}
