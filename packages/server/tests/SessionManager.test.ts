import { describe, it, expect, vi } from 'vitest';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import * as metadataModule from '../src/session/buildSessionMetadata.js';
import {
	expectSnapshotMetadata,
	expectStaticMetadata,
} from './helpers/expectSnapshotMetadata.js';

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
		expectSnapshotMetadata(snapshot.metadata);
		expectStaticMetadata(manager.getMetadata());
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

	it('caches metadata and returns frozen snapshots', () => {
		const buildSpy = vi.spyOn(metadataModule, 'buildSessionMetadata');
		const { manager, costKey } = createSyntheticSessionManager();
		expect(buildSpy).toHaveBeenCalledTimes(1);
		const baseline = manager.getMetadata();
		expect(buildSpy).toHaveBeenCalledTimes(1);
		expectStaticMetadata(baseline);
		expect(Object.isFrozen(baseline)).toBe(true);
		const resources = baseline.resources;
		if (!resources) {
			throw new Error('Session metadata missing resources');
		}
		expect(Object.isFrozen(resources)).toBe(true);
		expect(resources[costKey]).toBeDefined();
		const triggerEntries = Object.entries(baseline.triggers ?? {});
		expect(triggerEntries.length).toBeGreaterThan(0);
		for (const [, trigger] of triggerEntries) {
			if (trigger) {
				expect(Object.isFrozen(trigger)).toBe(true);
			}
		}
		const statEntries = Object.entries(baseline.stats ?? {});
		expect(statEntries.length).toBeGreaterThan(0);
		for (const [, stat] of statEntries) {
			if (stat) {
				expect(Object.isFrozen(stat)).toBe(true);
			}
		}
		const overviewTokens = baseline.overview?.hero?.tokens ?? {};
		const overviewTokenKeys = Object.keys(overviewTokens);
		expect(overviewTokenKeys.length).toBeGreaterThan(0);
		if (baseline.overview?.hero?.tokens) {
			expect(Object.isFrozen(baseline.overview.hero.tokens)).toBe(true);
		}
		const next = manager.getMetadata();
		expect(next).toBe(baseline);
		expect(buildSpy).toHaveBeenCalledTimes(1);
		const resourceUpdateResult = Reflect.set(resources, costKey, {
			label: 'changed',
		});
		expect(resourceUpdateResult).toBe(false);
		expect(resources[costKey]?.label).not.toBe('changed');
		const [triggerKey, triggerMeta] = triggerEntries[0] ?? [];
		if (triggerKey && triggerMeta) {
			const triggerUpdateResult = Reflect.set(triggerMeta, 'label', 'changed');
			expect(triggerUpdateResult).toBe(false);
			expect(triggerMeta.label).not.toBe('changed');
		}
		const [, statMeta] = statEntries[0] ?? [];
		if (statMeta) {
			const statUpdateResult = Reflect.set(statMeta, 'label', 'changed');
			expect(statUpdateResult).toBe(false);
			expect(statMeta.label).not.toBe('changed');
		}
		const [overviewTokenKey] = overviewTokenKeys;
		if (baseline.overview?.hero?.tokens && overviewTokenKey) {
			const tokenUpdateResult = Reflect.set(
				baseline.overview.hero.tokens,
				overviewTokenKey,
				'changed',
			);
			expect(tokenUpdateResult).toBe(false);
			expect(baseline.overview.hero.tokens[overviewTokenKey]).not.toBe(
				'changed',
			);
		}
		const finalSnapshot = manager.getMetadata();
		expect(finalSnapshot).toBe(baseline);
		buildSpy.mockRestore();
	});

	it('keeps metadata stable after sessions mutate state', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const snapshotMetadata = manager.getMetadata();
		const session = manager.createSession('metadata-stability');
		expectSnapshotMetadata(session.getSnapshot().metadata);
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
