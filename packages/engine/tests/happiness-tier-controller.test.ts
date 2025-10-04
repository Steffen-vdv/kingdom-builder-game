/* eslint-disable max-lines */
import { describe, it, expect } from 'vitest';
import {
	RULES,
	PHASES,
	Resource as CResource,
} from '@kingdom-builder/contents';
import {
	happinessTier,
	passiveParams,
	effect,
	Types,
	PassiveMethods,
} from '@kingdom-builder/contents/config/builders';
import { runEffects, getActionCosts } from '../src';
import { createTestEngine } from './helpers';
import { createContentFactory } from './factories/content';
import type { EffectConfig } from '@kingdom-builder/engine/config/schema';
import type { PassiveMetadata, RuleSet } from '../src/services';

type SkipConfig = {
	phases?: string[];
	steps?: Array<{ phaseId: string; stepId: string }>;
};

function buildTierPassiveEffect({
	tierId,
	passiveId,
	summary,
	removalText,
	removalCondition,
	nestedEffects = [],
	skip,
}: {
	tierId: string;
	passiveId: string;
	summary: string;
	removalText?: string;
	removalCondition?: string;
	nestedEffects?: EffectConfig[];
	skip?: SkipConfig;
}) {
	const paramsBuilder = passiveParams().id(passiveId).detail(summary);
	const meta: PassiveMetadata = {
		source: { type: 'tiered-resource', id: tierId },
	};
	if (removalCondition || removalText) {
		const removal: PassiveMetadata['removal'] = {};
		if (removalCondition) {
			removal.token = removalCondition;
		}
		if (removalText) {
			removal.text = removalText;
		}
		if (Object.keys(removal).length > 0) {
			meta.removal = removal;
		}
	}
	paramsBuilder.meta(meta);
	const builder = effect(Types.Passive, PassiveMethods.ADD).params(
		paramsBuilder.build(),
	);
	const phases = skip?.phases ?? [];
	const steps = skip?.steps ?? [];
	if (phases.length > 0 || steps.length > 0) {
		builder.effect(
			effect('phase_skip', 'add')
				.params({
					source: passiveId,
					...(phases.length > 0 ? { phases } : {}),
					...(steps.length > 0 ? { steps } : {}),
				})
				.build(),
		);
	}
	nestedEffects.forEach((nested) => builder.effect(nested));
	return builder.build();
}

function getTierPassiveIds(tier: RuleSet['tierDefinitions'][number]): string[] {
	return tier.transition.enter
		.filter(
			(entry) =>
				entry.type === Types.Passive && entry.method === PassiveMethods.ADD,
		)
		.map((entry) => {
			const params = entry.params as { id?: string } | undefined;
			return params?.id;
		})
		.filter((id): id is string => Boolean(id));
}

describe('happiness tier controller', () => {
	it('swaps tier passives and updates skip markers when thresholds change', () => {
		const [firstPhase, secondPhase] = PHASES;
		const growthPhaseId = firstPhase?.id ?? '';
		const upkeepPhaseId = secondPhase?.id ?? growthPhaseId;
		const payUpkeepStepId =
			secondPhase?.steps?.[0]?.id ?? firstPhase?.steps?.[0]?.id ?? '';

		const customRules: RuleSet = {
			...RULES,
			tierDefinitions: [
				happinessTier('test:tier:low')
					.range(0, 2)
					.enter(
						buildTierPassiveEffect({
							tierId: 'test:tier:low',
							passiveId: 'test:passive:low',
							summary: 'test:tier:low',
							removalText: 'test.removal.low',
							skip: { phases: [growthPhaseId] },
						}),
					)
					.text((text) => text.removal('test.removal.low'))
					.display((display) => display.removalCondition('test.removal.low'))
					.build(),
				happinessTier('test:tier:high')
					.range(3)
					.enter(
						buildTierPassiveEffect({
							tierId: 'test:tier:high',
							passiveId: 'test:passive:high',
							summary: 'test:tier:high',
							removalText: 'test.removal.high',
							removalCondition: 'test.removal.high',
							skip: {
								steps: [
									{
										phaseId: upkeepPhaseId,
										stepId: payUpkeepStepId,
									},
								],
							},
						}),
					)
					.text((text) => text.removal('test.removal.high'))
					.display((display) => display.removalCondition('test.removal.high'))
					.build(),
			],
		};

		const ctx = createTestEngine({ rules: customRules });
		const player = ctx.activePlayer;
		const happinessKey = customRules.tieredResourceKey;
		const lowPassiveId = getTierPassiveIds(customRules.tierDefinitions[0]!)[0];
		const highPassiveId = getTierPassiveIds(customRules.tierDefinitions[1]!)[0];

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
		expect(highMeta?.removal?.text).toBe(highTier.transition.text?.removal);

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
					.enter(
						buildTierPassiveEffect({
							tierId: 'test:tier:base',
							passiveId: 'test:passive:base',
							summary: 'test.base',
						}),
					)
					.text((text) => text.summary('test.base'))
					.build(),
				happinessTier('test:tier:boosted')
					.range(3)
					.enter(
						buildTierPassiveEffect({
							tierId: 'test:tier:boosted',
							passiveId: 'test:passive:boosted',
							summary: 'test.boosted',
							nestedEffects: [
								{
									type: 'cost_mod',
									method: 'add',
									params: {
										id: 'tier:discount',
										key: CResource.gold,
										percent: 0.1,
									},
								},
							],
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
		const boostedPassiveId = getTierPassiveIds(
			customRules.tierDefinitions[1]!,
		)[0];
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
/* eslint-enable max-lines */
