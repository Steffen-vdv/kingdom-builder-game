import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SQLiteSessionStore } from '../src/session/sqlite/SQLiteSessionStore.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

function createDatabasePath(prefix: string): {
	dbPath: string;
	cleanup: () => void;
} {
	const directory = mkdtempSync(path.join(tmpdir(), prefix));
	const dbPath = path.join(directory, 'sessions.db');
	return {
		dbPath,
		cleanup: () => {
			rmSync(directory, { recursive: true, force: true });
		},
	};
}

describe('SessionManager persistence', () => {
	it('restores persisted sessions from sqlite store', () => {
		const { dbPath, cleanup } = createDatabasePath('kb-session-restore-');
		try {
			const store = new SQLiteSessionStore({ filePath: dbPath });
			const { manager } = createSyntheticSessionManager({ store });
			const sessionId = 'persisted-session';
			manager.createSession(sessionId, { devMode: true });
			const metadata = manager.getSessionMetadata(sessionId);
			const registries = manager.getSessionRegistries(sessionId);
			const snapshot = manager.getSnapshot(sessionId);
			expect(snapshot.game.devMode).toBe(true);
			store.close();

			const reopenedStore = new SQLiteSessionStore({ filePath: dbPath });
			const { manager: restoredManager } = createSyntheticSessionManager({
				store: reopenedStore,
			});
			expect(restoredManager.getSessionCount()).toBe(1);
			const restoredSnapshot = restoredManager.getSnapshot(sessionId);
			expect(restoredSnapshot.game.devMode).toBe(true);
			expect(restoredManager.getSessionMetadata(sessionId)).toEqual(metadata);
			expect(restoredManager.getSessionRegistries(sessionId)).toEqual(
				registries,
			);
			reopenedStore.close();
		} finally {
			cleanup();
		}
	});

	it('removes persisted sessions after destruction and expiration', () => {
		const { dbPath: destroyDbPath, cleanup: destroyCleanup } =
			createDatabasePath('kb-session-destroy-');
		try {
			const store = new SQLiteSessionStore({ filePath: destroyDbPath });
			const { manager } = createSyntheticSessionManager({ store });
			const sessionId = 'destroy-me';
			manager.createSession(sessionId);
			expect(manager.destroySession(sessionId)).toBe(true);
			store.close();

			const verifyStore = new SQLiteSessionStore({ filePath: destroyDbPath });
			const { manager: verifyManager } = createSyntheticSessionManager({
				store: verifyStore,
			});
			expect(verifyManager.getSessionCount()).toBe(0);
			verifyStore.close();
		} finally {
			destroyCleanup();
		}

		const { dbPath: purgeDbPath, cleanup: purgeCleanup } =
			createDatabasePath('kb-session-purge-');
		try {
			let now = 0;
			const store = new SQLiteSessionStore({ filePath: purgeDbPath });
			const { manager } = createSyntheticSessionManager({
				store,
				maxIdleDurationMs: 1,
				now: () => now,
			});
			const sessionId = 'expire-me';
			manager.createSession(sessionId);
			now = 5;
			expect(manager.getSession(sessionId)).toBeUndefined();
			store.close();

			const verifyStore = new SQLiteSessionStore({ filePath: purgeDbPath });
			const { manager: verifyManager } = createSyntheticSessionManager({
				store: verifyStore,
			});
			expect(verifyManager.getSessionCount()).toBe(0);
			verifyStore.close();
		} finally {
			purgeCleanup();
		}
	});
});
