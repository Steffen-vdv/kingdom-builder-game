import type {
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { type CreateSessionResult } from './sessionSdk';

export type Session = CreateSessionResult['session'];
export type LegacySession = CreateSessionResult['legacySession'];
export type SessionRegistries = CreateSessionResult['registries'];
export type SessionResourceKeys = string[];
export type SessionResourceKey = string;
export type SessionMetadata = SessionSnapshotMetadata;

export type { SessionRuleSnapshot, SessionSnapshot };

export interface SessionQueueHelpers {
	enqueue<T>(task: () => Promise<T> | T): Promise<T>;
	getCurrentSession: () => Session;
	getLegacySession: () => LegacySession;
	getLatestSnapshot: () => SessionSnapshot | null;
}
