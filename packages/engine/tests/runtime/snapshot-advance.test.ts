import { describe, expect, it } from 'vitest';
import { snapshotAdvance } from '../../src/runtime/engine_snapshot';
import type { AdvanceResult, AdvanceSkip } from '../../src/phases/advance';
import type { PassiveMetadata } from '../../src/services';
import type { EffectDef } from '@kingdom-builder/protocol';
import { createTestEngine } from '../helpers';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';
import {
	Resource as CResource,
	Stat as CStat,
} from '@kingdom-builder/contents';

describe('snapshotAdvance', () => {
	it('clones advance results with skip metadata and complex effects', () => {
		const context = createTestEngine();
		const activePlayer = context.activePlayer;
		// Use known ResourceV2 IDs directly
		const resourceKey = CResource.gold;
		const statKey = CStat.armyStrength;
		const developmentEntry = context.developments.entries()[0];
		const developmentId = developmentEntry?.[0] ?? 'test:development';
		const outerParams = resourceAmountParams({
			key: resourceKey,
			amount: 3,
		});
		const outerEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: outerParams,
			effects: [
				{
					type: 'stat',
					method: 'add',
					params: { key: statKey, amount: 1 },
					meta: { tag: 'nested' },
				},
			],
			evaluator: { type: 'development', params: { id: developmentId } },
			meta: { tier: 'outer' },
		};
		const chainedParams = resourceAmountParams({
			key: resourceKey,
			amount: 1,
		});
		const chainedEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: chainedParams,
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
		const originalResource = activePlayer.resourceValues[resourceKey] ?? 0;
		const snapshot = snapshotAdvance(context, original);
		const firstSource = snapshot.skipped?.sources[0];
		expect(snapshot.player).not.toBe(original.player);
		expect(snapshot.effects).not.toBe(original.effects);
		expect(snapshot.skipped?.sources).not.toBe(original.skipped?.sources);
		snapshot.player.resourceValues[resourceKey] =
			(snapshot.player.resourceValues[resourceKey] ?? 0) + 999;
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
		expect(activePlayer.resourceValues[resourceKey]).toBe(originalResource);
		expect(original.player.resourceValues[resourceKey]).toBe(originalResource);
		expect(original.effects).toHaveLength(2);
		expect(original.effects[0]?.method).toBe('add');
		expect(original.effects[0]?.params).toMatchObject({
			key: resourceKey,
			amount: 3,
		});
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
		// Use known ResourceV2 ID directly
		const resourceKey = CResource.gold;
		const singleParams = resourceAmountParams({
			key: resourceKey,
			amount: 2,
		});
		const singleEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: singleParams,
		};
		const original: AdvanceResult = {
			phase: context.game.currentPhase,
			step: context.game.currentStep,
			effects: [singleEffect],
			player: activePlayer,
		};
		const originalValue = activePlayer.resourceValues[resourceKey] ?? 0;
		const snapshot = snapshotAdvance(context, original);
		expect(snapshot.skipped).toBeUndefined();
		snapshot.player.resourceValues[resourceKey] =
			(snapshot.player.resourceValues[resourceKey] ?? 0) + 100;
		snapshot.effects[0]!.method = 'remove';
		snapshot.effects.push({ type: 'extra' });
		expect(original.skipped).toBeUndefined();
		expect(original.effects).toHaveLength(1);
		expect(original.effects[0]?.method).toBe('add');
		expect(activePlayer.resourceValues[resourceKey]).toBe(originalValue);
		expect(original.player.resourceValues[resourceKey]).toBe(originalValue);
	});
});
