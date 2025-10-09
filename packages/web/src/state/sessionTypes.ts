import { type CreateSessionResult } from './sessionSdk';

export type Session = CreateSessionResult['session'];
export type SessionSnapshot = CreateSessionResult['snapshot'];
export type SessionRuleSnapshot = CreateSessionResult['ruleSnapshot'];
export type SessionRegistries = CreateSessionResult['registries'];
export type SessionResourceKeys = CreateSessionResult['resourceKeys'];
export type SessionResourceKey = SessionResourceKeys[number];
export type SessionMetadata = CreateSessionResult['metadata'];

export interface SessionQueueHelpers {
	enqueue<T>(task: () => Promise<T> | T): Promise<T>;
	getCurrentSession: () => Session;
	getLatestSnapshot: () => SessionSnapshot | null;
}
