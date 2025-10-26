import { describe, expect, it } from 'vitest';
import { snapshotAdvance } from '../../src/runtime/engine_snapshot';
import type { AdvanceResult, AdvanceSkip } from '../../src/phases/advance';
import type { PassiveMetadata } from '../../src/services';
import type { EffectDef } from '@kingdom-builder/protocol';
import { createTestEngine } from '../helpers';
import {
	resourceAmountParams,
	statAmountParams,
} from '../helpers/resourceV2Params.ts';

function getFirstKey(source: Record<string, unknown>): string {
	const [first] = Object.keys(source);
	return first ?? 'test:key';
}

describe('snapshotAdvance', () => {
	it('clones advance results with skip metadata and complex effects', () => {
		const context = createTestEngine();
		const activePlayer = context.activePlayer;
		const resourceKey = getFirstKey(activePlayer.resources);
		const statKey = getFirstKey(activePlayer.stats);
		const developmentEntry = context.developments.entries()[0];
		const developmentId = developmentEntry?.[0] ?? 'test:development';
		const outerEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: resourceAmountParams({
				key: resourceKey,
				amount: 3,
			}),
			effects: [
				{
					type: 'stat',
					method: 'add',
					params: statAmountParams({
						key: statKey,
						amount: 1,
					}),
					meta: { tag: 'nested' },
				},
			],
			evaluator: { type: 'development', params: { id: developmentId } },
			meta: { tier: 'outer' },
		};
		const chainedEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: resourceAmountParams({
				key: resourceKey,
				amount: 1,
			}),
			meta: { sequence: [1, 2, 3] },
		};
		const skipMeta: PassiveMetadata = {
			source: {
				type: 'development',
				id: developmentId,
				icon: '🛡️',
				labelToken: 'development.label',
				name: 'Snapshot Source',
			},
			removal: { text: 'Remove this passive' },
		};
		const skip: AdvanceSkip = {
			type: 'phase',
			phaseId: context.game.currentPhase,
			sources: [
				{ id: 'source:primary', detail: 'Primary detail', meta: skipMeta },
				{ id: 'source:secondary', detail: 'Secondary detail' },
			],
		};
		const original: AdvanceResult = {
			phase: context.game.currentPhase,
			step: context.game.currentStep,
			effects: [outerEffect, chainedEffect],
			player: activePlayer,
			skipped: skip,
		};
		const originalPhase = context.game.currentPhase;
		const originalStep = context.game.currentStep;
		const originalResource = activePlayer.resources[resourceKey];
		const snapshot = snapshotAdvance(context, original);
		const firstSource = snapshot.skipped?.sources[0];
		expect(snapshot.player).not.toBe(original.player);
		expect(snapshot.effects).not.toBe(original.effects);
		expect(snapshot.skipped?.sources).not.toBe(original.skipped?.sources);
		snapshot.player.resources[resourceKey] =
			(snapshot.player.resources[resourceKey] ?? 0) + 999;
		snapshot.effects[0]!.method = 'mutated-method';
		snapshot.effects[0]!.params = resourceAmountParams({
			key: resourceKey,
			amount: 99,
		});
		snapshot.effects[0]!.effects = [];
		snapshot.effects.push({ type: 'mutated' });
		if (firstSource) {
			firstSource.detail = 'Mutated detail';
			if (firstSource.meta?.source) {
				firstSource.meta.source.icon = 'mutated-icon';
			}
			if (firstSource.meta?.removal) {
				firstSource.meta.removal.text = 'mutated-removal';
			}
		}
		snapshot.skipped?.sources.push({ id: 'source:mutated' });
		expect(context.game.currentPhase).toBe(originalPhase);
		expect(context.game.currentStep).toBe(originalStep);
		expect(activePlayer.resources[resourceKey]).toBe(originalResource);
		expect(original.player.resources[resourceKey]).toBe(originalResource);
		expect(original.effects).toHaveLength(2);
		expect(original.effects[0]?.method).toBe('add');
		expect(original.effects[0]?.params).toEqual(
			resourceAmountParams({
				key: resourceKey,
				amount: 3,
			}),
		);
		expect(original.skipped?.sources).toHaveLength(2);
		expect(original.skipped?.sources[0]?.detail).toBe('Primary detail');
		expect(original.skipped?.sources[0]?.meta?.source?.icon).toBe('🛡️');
		expect(original.skipped?.sources[0]?.meta?.removal?.text).toBe(
			'Remove this passive',
		);
	});
	it('omits skip data when advance results do not include skip info', () => {
		const context = createTestEngine();
		const activePlayer = context.activePlayer;
		const resourceKey = getFirstKey(activePlayer.resources);
		const singleEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: resourceAmountParams({
				key: resourceKey,
				amount: 2,
			}),
		};
		const original: AdvanceResult = {
			phase: context.game.currentPhase,
			step: context.game.currentStep,
			effects: [singleEffect],
			player: activePlayer,
		};
		const originalValue = activePlayer.resources[resourceKey];
		const snapshot = snapshotAdvance(context, original);
		expect(snapshot.skipped).toBeUndefined();
		snapshot.player.resources[resourceKey] =
			(snapshot.player.resources[resourceKey] ?? 0) + 100;
		snapshot.effects[0]!.method = 'remove';
		snapshot.effects.push({ type: 'extra' });
		expect(original.skipped).toBeUndefined();
		expect(original.effects).toHaveLength(1);
		expect(original.effects[0]?.method).toBe('add');
		expect(activePlayer.resources[resourceKey]).toBe(originalValue);
		expect(original.player.resources[resourceKey]).toBe(originalValue);
	});
});
