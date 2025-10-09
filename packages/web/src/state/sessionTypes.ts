import type {
	SessionRuleSnapshot as ProtocolSessionRuleSnapshot,
	SessionSnapshot as ProtocolSessionSnapshot,
	SessionSnapshotMetadata as ProtocolSessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import type { CreateSessionResult, SessionHandle } from './sessionSdk';

export type Session = SessionHandle;
export type LegacySession = CreateSessionResult['legacySession'];
export type SessionRegistries = CreateSessionResult['registries'];
export type SessionResourceKeys = CreateSessionResult['resourceKeys'];
export type SessionResourceKey = SessionResourceKeys[number];
export type SessionSnapshot = ProtocolSessionSnapshot;
export type SessionRuleSnapshot = ProtocolSessionRuleSnapshot;
export type SessionSnapshotMetadata = ProtocolSessionSnapshotMetadata;
export type SessionMetadata = SessionSnapshotMetadata;

export interface SessionQueueHelpers {
	enqueue<T>(task: () => Promise<T> | T): Promise<T>;
	getCurrentSession: () => Session;
	getLegacySession: () => LegacySession;
	getLatestSnapshot: () => SessionSnapshot | null;
}
