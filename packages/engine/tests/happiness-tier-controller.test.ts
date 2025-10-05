import { describe, it, expect } from 'vitest';
import {
	RULES,
	PHASES,
	Resource as CResource,
} from '@kingdom-builder/contents';
import {
	happinessTier,
	effect,
	passiveParams,
} from '@kingdom-builder/contents/config/builders';
import {
	Types,
	PassiveMethods,
} from '@kingdom-builder/contents/config/builderShared';
import { runEffects, getActionCosts } from '../src';
import { createTestEngine } from './helpers';
import { createContentFactory } from './factories/content';
import type { RuleSet } from '../src/services';

describe('happiness tier controller', () => {
	it('swaps tier passives and updates skip markers when thresholds change', () => {
		const [firstPhase, secondPhase] = PHASES;
		const growthPhaseId = firstPhase?.id ?? '';
		const upkeepPhaseId = secondPhase?.id ?? growthPhaseId;
		const payUpkeepStepId =
			secondPhase?.steps?.[0]?.id ?? firstPhase?.steps?.[0]?.id ?? '';

		const lowRemovalToken = 'test.removal.low';
		const highRemovalToken = 'test.removal.high';
		const customRules: RuleSet = {
			...RULES,
			tierDefinitions: [
				happinessTier('test:tier:low')
					.range(0, 2)
					.passive(
						effect()
							.type(Types.Passive)
							.method(PassiveMethods.ADD)
							.params(
								passiveParams()
									.id('test:passive:low')
									.meta({
										source: {
											type: 'tiered-resource',
											id: 'test:tier:low',
										},
										removal: { token: lowRemovalToken },
									})
									.skipPhase(growthPhaseId)
									.build(),
							),
					)
					.text((text) => text.removal(lowRemovalToken))
					.display((display) => display.removalCondition(lowRemovalToken))
					.build(),
				happinessTier('test:tier:high')
					.range(3)
					.passive(
						effect()
							.type(Types.Passive)
							.method(PassiveMethods.ADD)
							.params(
								passiveParams()
									.id('test:passive:high')
									.meta({
										source: {
											type: 'tiered-resource',
											id: 'test:tier:high',
										},
										removal: {
											token: highRemovalToken,
											text: 'test.removal.high',
										},
									})
									.skipStep(upkeepPhaseId, payUpkeepStepId)
									.build(),
							),
					)
					.text((text) => text.removal(highRemovalToken))
					.display((display) => display.removalCondition(highRemovalToken))
					.build(),
			],
		};

		const ctx = createTestEngine({ rules: customRules });
		const player = ctx.activePlayer;
		const happinessKey = customRules.tieredResourceKey;
		const lowPassiveId = customRules.tierDefinitions[0]!.preview?.id ?? '';
		const highPassiveId = customRules.tierDefinitions[1]!.preview?.id ?? '';

		const initialPassives = ctx.passives
			.list(player.id)
			.map((passive) => passive.id);
		expect(initialPassives).toContain(lowPassiveId);
		expect(player.skipPhases[growthPhaseId]?.[lowPassiveId]).toBe(true);

		runEffects(
			[
				{
					type: 'resource',
					method: 'add',
					params: { key: happinessKey, amount: 5 },
				},
			],
			ctx,
		);

		const summariesAfterGain = ctx.passives.list(player.id);
		const idsAfterGain = summariesAfterGain.map((summary) => summary.id);
		expect(idsAfterGain).toContain(highPassiveId);
		expect(idsAfterGain).not.toContain(lowPassiveId);
		expect(player.skipPhases[growthPhaseId]).toBeUndefined();
		const highSkipBucket = player.skipSteps[upkeepPhaseId]?.[payUpkeepStepId];
		expect(highSkipBucket?.[highPassiveId]).toBe(true);

		const highRecord = ctx.passives
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
					params: { key: happinessKey, amount: 5 },
				},
			],
			ctx,
		);

		expect(ctx.passives.list(player.id)).not.toContain(highPassiveId);
		expect(player.skipSteps[upkeepPhaseId]).toBeUndefined();
	});

	it('applies tier passive modifiers additively with existing cost modifiers', () => {
		const customRules: RuleSet = {
			...RULES,
			tierDefinitions: [
				happinessTier('test:tier:base')
					.range(0, 2)
					.passive(
						effect()
							.type(Types.Passive)
							.method(PassiveMethods.ADD)
							.params(
								passiveParams()
									.id('test:passive:base')
									.detail('test.base')
									.meta({
										source: {
											type: 'tiered-resource',
											id: 'test:tier:base',
										},
									})
									.build(),
							),
					)
					.text((text) => text.summary('test.base'))
					.build(),
				happinessTier('test:tier:boosted')
					.range(3)
					.passive(
						effect()
							.type(Types.Passive)
							.method(PassiveMethods.ADD)
							.params(
								passiveParams()
									.id('test:passive:boosted')
									.detail('test.boosted')
									.meta({
										source: {
											type: 'tiered-resource',
											id: 'test:tier:boosted',
										},
									})
									.build(),
							)
							.effect({
								type: 'cost_mod',
								method: 'add',
								params: {
									id: 'tier:discount',
									key: CResource.gold,
									percent: 0.1,
								},
							}),
					)
					.text((text) => text.summary('test.boosted'))
					.build(),
			],
		};

		const content = createContentFactory();
		const costAction = content.action({
			baseCosts: { [CResource.gold]: 20 },
		});
		const ctx = createTestEngine({
			actions: content.actions,
			rules: customRules,
		});

		const baseCost = getActionCosts(costAction.id, ctx)[CResource.gold] ?? 0;
		expect(baseCost).toBeCloseTo(20);

		ctx.passives.registerCostModifier('external', () => ({
			percent: { [CResource.gold]: 0.05 },
		}));

		const withExternal =
			getActionCosts(costAction.id, ctx)[CResource.gold] ?? 0;
		expect(withExternal).toBeCloseTo(20 * (1 + 0.05));

		runEffects(
			[
				{
					type: 'resource',
					method: 'add',
					params: { key: customRules.tieredResourceKey, amount: 3 },
				},
			],
			ctx,
		);

		const idsAfterGain = ctx.passives
			.list(ctx.activePlayer.id)
			.map((passive) => passive.id);
		const boostedPassiveId = customRules.tierDefinitions[1]!.preview?.id ?? '';
		expect(idsAfterGain).toContain(boostedPassiveId);

		const withTierPassive =
			getActionCosts(costAction.id, ctx)[CResource.gold] ?? 0;
		expect(withTierPassive).toBeCloseTo(20 * (1 + 0.05 + 0.1));

		runEffects(
			[
				{
					type: 'resource',
					method: 'remove',
					params: { key: customRules.tieredResourceKey, amount: 3 },
				},
			],
			ctx,
		);

		const afterDrop = getActionCosts(costAction.id, ctx)[CResource.gold] ?? 0;
		expect(afterDrop).toBeCloseTo(20 * (1 + 0.05));
	});
});
