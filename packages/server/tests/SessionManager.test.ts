import { describe, it, expect, vi } from 'vitest';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import * as metadataModule from '../src/session/buildSessionMetadata.js';

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

	it('enforces maximum session limits', () => {
		const { manager } = createSyntheticSessionManager({ maxSessions: 1 });
		manager.createSession('limit-1');
		expect(() => manager.createSession('limit-2')).toThrow(
			'Maximum session count reached.',
		);
	});

	it('purges sessions that exceed the idle timeout', () => {
		let now = 0;
		const { manager } = createSyntheticSessionManager({
			maxIdleDurationMs: 1,
			now: () => now,
		});
		manager.createSession('expire-me');
		now = 2;
		expect(manager.getSession('expire-me')).toBeUndefined();
		expect(manager.getSessionCount()).toBe(0);
	});

	it('caches metadata and clones results on access', () => {
		const buildSpy = vi.spyOn(metadataModule, 'buildSessionMetadata');
		const { manager, costKey } = createSyntheticSessionManager();
		expect(buildSpy).toHaveBeenCalledTimes(1);
		const baseline = manager.getMetadata();
		expect(buildSpy).toHaveBeenCalledTimes(1);
		expect(baseline.resources?.[costKey]).toBeDefined();
		const mutated = manager.getMetadata();
		expect(mutated).not.toBe(baseline);
		expect(mutated).toEqual(baseline);
		if (mutated.resources) {
			mutated.resources[costKey] = { label: 'changed' };
		}
		const next = manager.getMetadata();
		expect(next).toEqual(baseline);
		expect(next.resources?.[costKey]?.label).not.toBe('changed');
		buildSpy.mockRestore();
	});

	it('keeps metadata stable after sessions mutate state', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const snapshotMetadata = manager.getMetadata();
		const session = manager.createSession('metadata-stability');
		await session.enqueue(() => session.performAction(actionId));
		session.advancePhase();
		expect(manager.getMetadata()).toEqual(snapshotMetadata);
	});

	it('throws when retrieving snapshots for unknown sessions', () => {
		const { manager } = createSyntheticSessionManager();
		expect(() => manager.getSnapshot('missing')).toThrow(
			'Session "missing" was not found.',
		);
	});
});
