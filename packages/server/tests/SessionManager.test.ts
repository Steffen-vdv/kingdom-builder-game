import { describe, it, expect, vi } from 'vitest';
import type {
	SessionMetadataDescriptor,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import * as metadataModule from '../src/session/buildSessionMetadata.js';
import { mergeSessionMetadata } from '../src/session/mergeSessionMetadata.js';
import {
	expectSnapshotMetadata,
	expectStaticMetadata,
} from './helpers/expectSnapshotMetadata.js';

describe('SessionManager', () => {
	it('creates and retrieves sessions using synthetic content', () => {
		const { manager, costResourceId, gainResourceId } =
			createSyntheticSessionManager();
		const sessionId = 'session-1';
		const session = manager.createSession(sessionId, {
			devMode: true,
		});
		expect(manager.getSession(sessionId)).toBe(session);
		expect(manager.getSessionCount()).toBe(1);
		const snapshot = manager.getSnapshot(sessionId);
		const staticMetadata = manager.getMetadata();
		const mergedMetadata = mergeSessionMetadata({
			baseMetadata: staticMetadata,
			snapshotMetadata: snapshot.metadata,
		});
		expectSnapshotMetadata(mergedMetadata);
		expectStaticMetadata(staticMetadata);
		const [activePlayer] = snapshot.game.players;
		expect(activePlayer?.values[costResourceId]).toBeDefined();
		expect(snapshot.rules.tieredResourceKey).toBe(gainResourceId);
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
		const { manager, gainResourceId } = createSyntheticSessionManager();
		const sessionId = 'rules';
		manager.createSession(sessionId);
		const ruleSnapshot = manager.getRuleSnapshot(sessionId);
		expect(ruleSnapshot.tieredResourceKey).toBe(gainResourceId);
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
		const { manager, costResourceId } = createSyntheticSessionManager();
		expect(buildSpy).toHaveBeenCalledTimes(1);
		const baseline = manager.getMetadata();
		expectStaticMetadata(baseline);
		expect(buildSpy).toHaveBeenCalledTimes(1);
		expect(baseline.resources?.[costResourceId]).toBeDefined();
		const triggerKeys = Object.keys(baseline.triggers ?? {});
		expect(triggerKeys.length).toBeGreaterThan(0);
		// Resources now contain all resource types including former stats
		const resourceKeys = Object.keys(baseline.resources ?? {});
		expect(resourceKeys.length).toBeGreaterThan(0);
		const heroTokens = baseline.overview?.hero?.tokens ?? {};
		const overviewTokenKeys = Object.keys(heroTokens);
		expect(overviewTokenKeys.length).toBeGreaterThan(0);
		const mutated = manager.getMetadata();
		expect(mutated).not.toBe(baseline);
		expect(mutated).toEqual(baseline);
		if (mutated.resources) {
			mutated.resources[costResourceId] = { label: 'changed' };
		}
		const [triggerKey] = triggerKeys;
		if (mutated.triggers && triggerKey) {
			const original = mutated.triggers[triggerKey];
			const descriptor: SessionTriggerMetadata = {
				...(original ?? {}),
				label: 'changed',
			};
			mutated.triggers[triggerKey] = descriptor;
		}
		// Test that mutating resources doesn't affect subsequent gets
		const [resourceKey] = resourceKeys;
		if (mutated.resources && resourceKey) {
			const original = mutated.resources[resourceKey];
			const descriptor: SessionMetadataDescriptor = {
				...(original ?? {}),
				label: 'changed',
			};
			mutated.resources[resourceKey] = descriptor;
		}
		const [overviewTokenKey] = overviewTokenKeys;
		if (mutated.overview?.hero?.tokens && overviewTokenKey) {
			mutated.overview.hero.tokens[overviewTokenKey] = 'changed';
		}
		const next = manager.getMetadata();
		expect(next).toEqual(baseline);
		expect(next.resources?.[costResourceId]?.label).not.toBe('changed');
		if (triggerKey) {
			expect(next.triggers?.[triggerKey]?.label).not.toBe('changed');
		}
		if (resourceKey) {
			expect(next.resources?.[resourceKey]?.label).not.toBe('changed');
		}
		if (overviewTokenKey) {
			expect(next.overview?.hero?.tokens?.[overviewTokenKey]).not.toBe(
				'changed',
			);
		}
		buildSpy.mockRestore();
	});

	it('exposes a frozen runtime configuration snapshot', () => {
		const { manager, phases, rules, gainResourceId, primaryIconId } =
			createSyntheticSessionManager();
		const runtimeConfig = manager.getRuntimeConfig();
		expect(runtimeConfig.phases).toEqual(phases);
		expect(runtimeConfig.phases).not.toBe(phases);
		expect(runtimeConfig.rules).toEqual(rules);
		expect(runtimeConfig.rules).not.toBe(rules);
		expect(runtimeConfig.primaryIconId).toBe(primaryIconId);
		expect(Object.isFrozen(runtimeConfig)).toBe(true);
		expect(Object.isFrozen(runtimeConfig.phases)).toBe(true);
		expect(Object.isFrozen(runtimeConfig.rules)).toBe(true);
		expect(Object.isFrozen(runtimeConfig.resources)).toBe(true);
		const resourceEntry = runtimeConfig.resources[gainResourceId];
		if (!resourceEntry) {
			throw new Error('Missing synthetic resource definition.');
		}
		expect(Object.isFrozen(resourceEntry)).toBe(true);
		expect(manager.getRuntimeConfig()).toBe(runtimeConfig);
	});

	it('keeps metadata stable after sessions mutate state', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const snapshotMetadata = manager.getMetadata();
		const session = manager.createSession('metadata-stability');
		const mergedInitial = mergeSessionMetadata({
			baseMetadata: snapshotMetadata,
			snapshotMetadata: session.getSnapshot().metadata,
		});
		expectSnapshotMetadata(mergedInitial);
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
