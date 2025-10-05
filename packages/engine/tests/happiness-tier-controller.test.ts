import { describe, it, expect } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import { runEffects, getActionCosts } from '../src';
import { createTestEngine } from './helpers';
import { createContentFactory } from './factories/content';
import {
	createTierSwapConfiguration,
	createTierCostRules,
} from './factories/happinessRules';

describe('happiness tier controller', () => {
	it('refreshes tier passives and skips after threshold change', () => {
		const {
			rules: customRules,
			growthPhaseId,
			upkeepPhaseId,
			payUpkeepStepId,
		} = createTierSwapConfiguration();

		const engineContext = createTestEngine({ rules: customRules });
		const player = engineContext.activePlayer;
		const happinessKey = customRules.tieredResourceKey;
		const lowPassiveId = customRules.tierDefinitions[0]!.preview?.id ?? '';
		const highPassiveId = customRules.tierDefinitions[1]!.preview?.id ?? '';

		const initialPassives = engineContext.passives
			.list(player.id)
			.map((passive) => passive.id);
		expect(initialPassives).toContain(lowPassiveId);
		expect(player.skipPhases[growthPhaseId]?.[lowPassiveId]).toBe(true);

		runEffects(
			[
				{
					type: 'resource',
					method: 'add',
					params: {
						key: happinessKey,
						amount: 5,
					},
				},
			],
			engineContext,
		);

		const summariesAfterGain = engineContext.passives.list(player.id);
		const idsAfterGain = summariesAfterGain.map((summary) => summary.id);
		expect(idsAfterGain).toContain(highPassiveId);
		expect(idsAfterGain).not.toContain(lowPassiveId);
		expect(player.skipPhases[growthPhaseId]).toBeUndefined();
		const highSkipBucket = player.skipSteps[upkeepPhaseId]?.[payUpkeepStepId];
		expect(highSkipBucket?.[highPassiveId]).toBe(true);

		const highRecord = engineContext.passives
			.values(player.id)
			.find((passive) => passive.id === highPassiveId);
		expect(highRecord).toBeDefined();
		const highMeta = highRecord!.meta;
		const highTier = customRules.tierDefinitions[1]!;
		expect(highMeta?.source?.id).toBe(highTier.id);
		expect(highMeta?.removal?.token).toBe(highTier.display?.removalCondition);
		expect(highMeta?.removal?.text).toBe(highTier.text?.removal);

		runEffects(
			[
				{
					type: 'resource',
					method: 'remove',
					params: {
						key: happinessKey,
						amount: 5,
					},
				},
			],
			engineContext,
		);

		expect(engineContext.passives.list(player.id)).not.toContain(highPassiveId);
		expect(player.skipSteps[upkeepPhaseId]).toBeUndefined();
	});

	it('stacks tier passive costs with external adjustments', () => {
		const customRules = createTierCostRules();
		const tierResourceKey = customRules.tieredResourceKey;
		const content = createContentFactory();
		const costAction = content.action({
			baseCosts: { [CResource.gold]: 20 },
		});
		const engineContext = createTestEngine({
			actions: content.actions,
			rules: customRules,
		});
		const goldCost = () => {
			const costs = getActionCosts(costAction.id, engineContext);
			return costs[CResource.gold] ?? 0;
		};

		const baseCost = goldCost();
		expect(baseCost).toBeCloseTo(20);

		engineContext.passives.registerCostModifier('external', () => ({
			percent: { [CResource.gold]: 0.05 },
		}));

		const withExternal = goldCost();
		expect(withExternal).toBeCloseTo(20 * (1 + 0.05));

		runEffects(
			[
				{
					type: 'resource',
					method: 'add',
					params: {
						key: tierResourceKey,
						amount: 3,
					},
				},
			],
			engineContext,
		);

		const idsAfterGain = engineContext.passives
			.list(engineContext.activePlayer.id)
			.map((passive) => passive.id);
		const boostedPassiveId = customRules.tierDefinitions[1]!.preview?.id ?? '';
		expect(idsAfterGain).toContain(boostedPassiveId);

		const withTierPassive = goldCost();
		expect(withTierPassive).toBeCloseTo(20 * (1 + 0.05 + 0.1));

		runEffects(
			[
				{
					type: 'resource',
					method: 'remove',
					params: {
						key: tierResourceKey,
						amount: 3,
					},
				},
			],
			engineContext,
		);

		const afterDrop = goldCost();
		expect(afterDrop).toBeCloseTo(20 * (1 + 0.05));
	});
});
