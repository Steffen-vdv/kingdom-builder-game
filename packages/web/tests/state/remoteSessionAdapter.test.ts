import { describe, expect, it } from 'vitest';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
	SessionPlayerId,
} from '@kingdom-builder/protocol/session';
import { createRemoteSessionAdapter } from '../helpers/remoteSessionAdapter';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import { createSessionRegistriesPayload } from '../helpers/sessionRegistries';
import { createTestSessionScaffold } from '../helpers/testSessionScaffold';

const scaffold = createTestSessionScaffold();
const registries = createSessionRegistriesPayload();
const resourceKeys = Object.keys(registries.resources ?? {});
const [resourceKey] = resourceKeys;
if (!resourceKey) {
	throw new Error('Expected at least one resource key for cache tests.');
}

const playerA = createSnapshotPlayer({
	id: 'A' as SessionPlayerId,
	name: 'Alpha',
	resources: { [resourceKey]: 10 },
});
const playerB = createSnapshotPlayer({
	id: 'B' as SessionPlayerId,
	name: 'Bravo',
	resources: { [resourceKey]: 5 },
});

const snapshot = createSessionSnapshot({
	players: [playerA, playerB],
	activePlayerId: playerA.id,
	opponentId: playerB.id,
	phases: scaffold.phases,
	actionCostResource: resourceKey,
	ruleSnapshot: scaffold.ruleSnapshot,
});

describe('RemoteSessionAdapter action metadata cache', () => {
	it('stores and clones action metadata for unique parameter keys', () => {
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId: 'session-cache-test',
			snapshot,
			registries,
		});
		try {
			expect(adapter.getActionCosts('build')).toBeNull();
			const baseCosts: SessionActionCostMap = { gold: 3 };
			adapter.primeActionCosts('build', undefined, baseCosts);
			const cachedCosts = adapter.getActionCosts('build');
			expect(cachedCosts).toEqual(baseCosts);
			if (!cachedCosts) {
				throw new Error('Expected cached costs to be available.');
			}
			cachedCosts.gold = 7;
			expect(adapter.getActionCosts('build')?.gold).toBe(3);

			const params = { id: 'structure-1' } as Record<string, unknown>;
			expect(adapter.getActionCosts('build', params)).toBeNull();
			const paramCosts: SessionActionCostMap = { wood: 2 };
			adapter.primeActionCosts('build', params, paramCosts);
			expect(adapter.getActionCosts('build', params)).toEqual(paramCosts);
			expect(adapter.getActionCosts('build')).toEqual(baseCosts);

			expect(adapter.getActionRequirements('train')).toBeNull();
			const requirements: SessionActionRequirementList = [
				{
					requirement: { type: 'mock', method: 'test' },
					message: 'Need more recruits.',
				},
			];
			adapter.primeActionRequirements('train', undefined, requirements);
			const cachedRequirements = adapter.getActionRequirements('train');
			expect(cachedRequirements).toEqual(requirements);
			if (!cachedRequirements) {
				throw new Error('Expected cached requirements to be available.');
			}
			cachedRequirements[0]!.message = 'Altered';
			expect(adapter.getActionRequirements('train')?.[0]?.message).toBe(
				'Need more recruits.',
			);

			const optionParams = { id: 'choice-1' } as Record<string, unknown>;
			expect(adapter.getActionOptions('decide', optionParams)).toBeNull();
			const optionGroups: ActionEffectGroup[] = [
				{
					id: 'group-1',
					title: 'Choose reward',
					options: [
						{
							id: 'option-1',
							actionId: 'reward-action',
						},
					],
				},
			];
			adapter.primeActionOptions('decide', optionParams, optionGroups);
			const cachedGroups = adapter.getActionOptions('decide', optionParams);
			expect(cachedGroups).toEqual(optionGroups);
			if (!cachedGroups) {
				throw new Error('Expected cached option groups to be available.');
			}
			cachedGroups[0]!.title = 'Modified';
			expect(adapter.getActionOptions('decide', optionParams)?.[0]?.title).toBe(
				'Choose reward',
			);
			expect(adapter.getActionOptions('decide')).toBeNull();
		} finally {
			cleanup();
		}
	});
});
