import { describe, it, expect } from 'vitest';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import type { GameConfig } from '@kingdom-builder/protocol';

describe('SessionManager', () => {
	it('creates and retrieves sessions using synthetic content', () => {
		const { manager, costKey, gainKey } = createSyntheticSessionManager();
		const sessionId = 'session-1';
		const session = manager.createSession(sessionId, {
			devMode: true,
		});
		expect(manager.getSession(sessionId)).toBe(session);
		expect(manager.getSessionCount()).toBe(1);
		const snapshot = manager.getSnapshot(sessionId);
		const [activePlayer] = snapshot.game.players;
		expect(activePlayer?.resources[costKey]).toBeDefined();
		expect(snapshot.rules.tieredResourceKey).toBe(gainKey);
		expect(snapshot.game.devMode).toBe(true);
	});

	it('destroys sessions and releases resources', () => {
		const { manager } = createSyntheticSessionManager();
		const sessionId = 'session-destroy';
		manager.createSession(sessionId);
		const destroyed = manager.destroySession(sessionId);
		expect(destroyed).toBe(true);
		expect(manager.getSession(sessionId)).toBeUndefined();
		expect(manager.getSessionCount()).toBe(0);
	});

	it('throws when creating a duplicate session identifier', () => {
		const { manager } = createSyntheticSessionManager();
		const sessionId = 'duplicate';
		manager.createSession(sessionId);
		expect(() => manager.createSession(sessionId)).toThrow(
			`Session "${sessionId}" already exists.`,
		);
	});

	it('provides rule snapshots from the active session', () => {
		const { manager, gainKey } = createSyntheticSessionManager();
		const sessionId = 'rules';
		manager.createSession(sessionId);
		const ruleSnapshot = manager.getRuleSnapshot(sessionId);
		expect(ruleSnapshot.tieredResourceKey).toBe(gainKey);
	});

	it('throws when retrieving snapshots for unknown sessions', () => {
		const { manager } = createSyntheticSessionManager();
		expect(() => manager.getSnapshot('missing')).toThrow(
			'Session "missing" was not found.',
		);
	});

	it('enforces the configured session capacity', () => {
		const { manager } = createSyntheticSessionManager({
			maxSessions: 1,
		});
		manager.createSession('primary');
		expect(() => manager.createSession('secondary')).toThrow(
			'Maximum session count reached.',
		);
	});

	it('purges sessions that exceed the idle timeout', () => {
		let current = 0;
		const { manager } = createSyntheticSessionManager({
			maxIdleDurationMs: 5,
			now: () => current,
		});
		manager.createSession('idle');
		current = 6;
		expect(manager.getSession('idle')).toBeUndefined();
	});

	it('applies custom configuration overrides when provided', () => {
		const { manager, costKey, gainKey, start } =
			createSyntheticSessionManager();
		const sessionId = 'configurable';
		const customStart = structuredClone(start);
		customStart.player.resources[costKey] = 5;
		customStart.player.resources[gainKey] = 2;
		const config: GameConfig = { start: customStart };
		manager.createSession(sessionId, { config });
		const snapshot = manager.getSnapshot(sessionId);
		const [player] = snapshot.game.players;
		expect(player?.resources[costKey]).toBe(5);
		expect(player?.resources[gainKey]).toBe(2);
	});
});
