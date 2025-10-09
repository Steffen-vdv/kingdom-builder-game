import { type CreateSessionResult, type SessionHandle } from './sessionSdk';

export type Session = SessionHandle;
export type SessionSnapshot = CreateSessionResult['snapshot'];
export type SessionRuleSnapshot = CreateSessionResult['ruleSnapshot'];
export type SessionRegistries = CreateSessionResult['registries'];
export type SessionResourceKeys = CreateSessionResult['resourceKeys'];
export type SessionResourceKey = SessionResourceKeys[number];
export type SessionMetadata = CreateSessionResult['metadata'];
export type LegacySession = CreateSessionResult['legacySession'];

export interface SessionQueueHelpers {
	enqueue<T>(task: () => Promise<T> | T): Promise<T>;
	getCurrentSession: () => Session;
	getLegacySession: () => LegacySession;
	getLatestSnapshot: () => SessionSnapshot | null;
}
