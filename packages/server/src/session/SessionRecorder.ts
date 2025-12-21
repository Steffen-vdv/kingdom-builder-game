import type {
	ActionParametersPayload,
	SessionPlayerId,
	SessionRegistriesPayload,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import type {
	ActionLogEntry,
	SessionPersistence,
} from './SessionPersistence.js';
import type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';

/**
 * Session record with action log for persistence.
 */
export interface SessionRecordWithLog {
	actionLog: ActionLogEntry[];
	getSnapshot(): SessionSnapshot;
	registries: SessionRegistriesPayload;
	metadata: SessionStaticMetadataPayload;
}

/**
 * Handles recording session actions for persistence.
 */
export function recordAction(
	sessionId: string,
	record: SessionRecordWithLog,
	persistence: SessionPersistence | undefined,
	actionId: string,
	params?: ActionParametersPayload,
): void {
	const entry: ActionLogEntry = { type: 'action', actionId };
	if (params !== undefined) {
		entry.params = params;
	}
	record.actionLog.push(entry);
	persistUpdate(sessionId, record, persistence, entry);
}

export function recordAdvance(
	sessionId: string,
	record: SessionRecordWithLog,
	persistence: SessionPersistence | undefined,
): void {
	const entry: ActionLogEntry = { type: 'advance' };
	record.actionLog.push(entry);
	persistUpdate(sessionId, record, persistence, entry);
}

export function recordPlayerNameChange(
	sessionId: string,
	record: SessionRecordWithLog,
	persistence: SessionPersistence | undefined,
	playerId: SessionPlayerId,
	name: string,
): void {
	const entry: ActionLogEntry = { type: 'player-name', playerId, name };
	record.actionLog.push(entry);
	persistUpdate(sessionId, record, persistence, entry);
}

export function recordDevModeChange(
	sessionId: string,
	record: SessionRecordWithLog,
	persistence: SessionPersistence | undefined,
	enabled: boolean,
): void {
	const entry: ActionLogEntry = { type: 'dev-mode', enabled };
	record.actionLog.push(entry);
	persistUpdate(sessionId, record, persistence, entry);
}

function persistUpdate(
	sessionId: string,
	record: SessionRecordWithLog,
	persistence: SessionPersistence | undefined,
	entry: ActionLogEntry,
): void {
	if (!persistence) {
		return;
	}
	const snapshot = record.getSnapshot();
	persistence.appendAction(
		sessionId,
		entry,
		snapshot,
		record.registries,
		record.metadata,
	);
}
