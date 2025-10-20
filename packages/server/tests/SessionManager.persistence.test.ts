import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { SQLiteSessionStore } from '../src/session/sqlite/SQLiteSessionStore.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

function createTemporaryDatabasePath(): string {
	const directory = mkdtempSync(join(tmpdir(), 'kb-session-store-'));
	return join(directory, 'sessions.db');
}

describe('SessionManager persistence', () => {
	it('recovers sessions across manager instances', () => {
		const databasePath = createTemporaryDatabasePath();
		const maxIdleDurationMs = 10_000;
		let currentTime = 1;
		const now = () => currentTime;
		const store = new SQLiteSessionStore(databasePath);
		const { manager: firstManager, engineOptions } =
			createSyntheticSessionManager({
				store,
				now,
				maxIdleDurationMs,
			});
		const sessionId = 'persisted-session';
		const session = firstManager.createSession(sessionId, { devMode: true });
		const baselineMetadata = firstManager.getSessionMetadata(sessionId);
		const baselineRegistries = firstManager.getSessionRegistries(sessionId);
		const snapshot = session.getSnapshot();
		expect(snapshot.game.devMode).toBe(true);
		store.close();
		const reopenedStore = new SQLiteSessionStore(databasePath);
		const { manager: secondManager } = createSyntheticSessionManager({
			store: reopenedStore,
			now,
			maxIdleDurationMs,
			engineOptions,
		});
		const restoredSession = secondManager.getSession(sessionId);
		expect(secondManager.getSessionCount()).toBe(1);
		expect(restoredSession).toBeDefined();
		const restoredMetadata = secondManager.getSessionMetadata(sessionId);
		const restoredRegistries = secondManager.getSessionRegistries(sessionId);
		expect(restoredMetadata).toEqual(baselineMetadata);
		expect(restoredRegistries).toEqual(baselineRegistries);
		const restoredSnapshot = restoredSession?.getSnapshot();
		expect(restoredSnapshot?.game.devMode).toBe(true);
		reopenedStore.close();
		rmSync(databasePath, { force: true });
		rmSync(dirname(databasePath), { recursive: true, force: true });
	});
});
