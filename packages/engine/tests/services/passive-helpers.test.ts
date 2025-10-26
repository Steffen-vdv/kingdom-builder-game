import { describe, expect, it } from 'vitest';
import { Resource } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { PlayerState } from '../../src/state';
import {
	clearSkipFlags,
	clonePassiveMetadata,
	clonePassiveRecord,
	registerSkipFlags,
	reverseEffect,
} from '../../src/services/passive_helpers';
import type {
	PassiveMetadata,
	PassiveRecord,
	PhaseSkipConfig,
} from '../../src/services/passive_types';
import type { EffectDef } from '../../src/effects';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

describe('passive helpers', () => {
	it('deeply clones passive records and metadata while pruning undefined', () => {
		const content = createContentFactory();
		const building = content.building({ icon: 'icon:test' });
		const source: PassiveMetadata = {
			source: {
				type: 'building',
				id: building.id,
				icon: building.icon,
				name: building.name,
			},
			removal: { text: 'remove-token' },
		};
		const nestedParams = resourceAmountParams({
			key: Resource.gold,
			amount: 3,
		});
		const nestedEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: nestedParams,
		};
		const record: PassiveRecord = {
			id: building.id,
			owner: 'A',
			frames: [() => ({})],
			name: undefined,
			icon: undefined,
			detail: undefined,
			effects: [
				nestedEffect,
				{
					type: 'resource',
					method: 'remove',
					params: resourceAmountParams({
						key: Resource.gold,
						amount: 1,
					}),
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: resourceAmountParams({
								key: Resource.gold,
								amount: 2,
							}),
						},
					],
				},
			],
			onGrowthPhase: [nestedEffect],
			meta: source,
			customData: {
				nested: [
					{
						value: {
							deep: [
								1,
								{
									label: 'alpha',
									notes: [
										building.id,
										{
											info: [content.action().id, 'delta'],
										},
									],
								},
							],
						},
					},
				],
			},
		};
		const metadataClone = clonePassiveMetadata(record.meta);
		expect(metadataClone).not.toBe(record.meta);
		expect(metadataClone?.source).not.toBe(record.meta?.source);
		expect(metadataClone?.removal).not.toBe(record.meta?.removal);
		if (metadataClone?.removal) {
			metadataClone.removal.text = 'changed';
		}
		expect(record.meta?.removal?.text).toBe('remove-token');

		const recordClone = clonePassiveRecord(record);
		expect(recordClone).not.toBe(record);
		expect('name' in recordClone).toBe(false);
		expect('icon' in recordClone).toBe(false);
		expect('detail' in recordClone).toBe(false);
		expect(recordClone.meta).not.toBe(record.meta);
		expect(recordClone.effects).not.toBe(record.effects);
		expect(recordClone.onGrowthPhase).not.toBe(record.onGrowthPhase);
		expect(recordClone.frames).not.toBe(record.frames);

		recordClone.frames.push(() => ({ mark: true }));
		(recordClone.effects?.[0]?.params as { amount: number }).amount = 12;
		const clonedNested = (
			recordClone.customData as {
				nested: Array<{ value: { deep: unknown[] } }>;
			}
		).nested[0]!.value.deep[1] as { label: string };
		clonedNested.label = 'beta';
		(
			(recordClone.customData as { nested: unknown[] }).nested as unknown[]
		).push({
			added: true,
		});

		expect(record.frames).toHaveLength(1);
		expect(record.effects?.[0]?.params).toEqual(nestedParams);
		const originalNested = (
			record.customData as { nested: Array<{ value: { deep: unknown[] } }> }
		).nested[0]!.value.deep[1] as { label: string };
		expect(originalNested.label).toBe('alpha');
		expect((record.customData as { nested: unknown[] }).nested).toHaveLength(1);
	});

	it('recursively flips add/remove methods in reverseEffect', () => {
		const baseAddParams = resourceAmountParams({
			key: Resource.gold,
			amount: 2,
		});
		const removalParams = resourceAmountParams({
			key: Resource.gold,
			amount: 1,
		});
		const chainedParams = resourceAmountParams({
			key: Resource.gold,
			amount: 4,
		});
		const base: EffectDef = {
			type: 'resource',
			method: 'add',
			params: baseAddParams,
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: removalParams,
				},
				{
					type: 'meta',
					method: 'noop',
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: chainedParams,
						},
					],
				},
			],
		};
		const reversed = reverseEffect(base);
		expect(reversed).not.toBe(base);
		expect(reversed.method).toBe('remove');
		expect(reversed.effects?.[0]?.method).toBe('add');
		expect(reversed.effects?.[1]?.method).toBe('noop');
		expect(reversed.effects?.[1]?.effects?.[0]?.method).toBe('remove');
		expect(base.method).toBe('add');
		expect(base.effects?.[0]?.method).toBe('remove');
		expect(base.effects?.[1]?.effects?.[0]?.method).toBe('add');
	});

	it('registers and clears skip flags on a player', () => {
		const content = createContentFactory();
		const primarySource = content.building().id;
		const secondarySource = content.building().id;
		const phaseA = content.action().id;
		const phaseB = content.action().id;
		const stepA = content.development().id;
		const stepB = content.development().id;
		const player = new PlayerState('A', 'Tester');
		const skip: PhaseSkipConfig = {
			phases: [phaseA, phaseB],
			steps: [
				{ phaseId: phaseA, stepId: stepA },
				{ phaseId: phaseB, stepId: stepB },
			],
		};
		registerSkipFlags(player, primarySource, skip);
		registerSkipFlags(player, secondarySource, {
			phases: [phaseA],
			steps: [{ phaseId: phaseA, stepId: stepA }],
		});
		expect(player.skipPhases[phaseA]?.[primarySource]).toBe(true);
		expect(player.skipPhases[phaseA]?.[secondarySource]).toBe(true);
		expect(player.skipPhases[phaseB]?.[primarySource]).toBe(true);
		expect(player.skipSteps[phaseA]?.[stepA]?.[primarySource]).toBe(true);
		expect(player.skipSteps[phaseA]?.[stepA]?.[secondarySource]).toBe(true);
		expect(player.skipSteps[phaseB]?.[stepB]?.[primarySource]).toBe(true);

		clearSkipFlags(player, primarySource, skip);
		expect(player.skipPhases[phaseA]?.[secondarySource]).toBe(true);
		expect(player.skipPhases[phaseB]).toBeUndefined();
		expect(player.skipSteps[phaseA]?.[stepA]?.[secondarySource]).toBe(true);
		expect(player.skipSteps[phaseB]).toBeUndefined();

		clearSkipFlags(player, secondarySource, {
			phases: [phaseA],
			steps: [{ phaseId: phaseA, stepId: stepA }],
		});
		expect(player.skipPhases[phaseA]).toBeUndefined();
		expect(player.skipSteps[phaseA]).toBeUndefined();
	});
});
