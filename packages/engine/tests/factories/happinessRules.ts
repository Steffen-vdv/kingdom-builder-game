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
import type { RuleSet } from '../../src/services';

interface TierSwapConfiguration {
	rules: RuleSet;
	growthPhaseId: string;
	upkeepPhaseId: string;
	payUpkeepStepId: string;
}

export const createTierSwapConfiguration = (): TierSwapConfiguration => {
	const [firstPhase, secondPhase] = PHASES;
	const growthPhaseId = firstPhase?.id ?? '';
	const upkeepPhaseId = secondPhase?.id ?? growthPhaseId;
	const payUpkeepStepId =
		secondPhase?.steps?.[0]?.id ?? firstPhase?.steps?.[0]?.id ?? '';

	const lowRemovalToken = 'test.removal.low';
	const highRemovalToken = 'test.removal.high';

	const rules: RuleSet = {
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

	return {
		rules,
		growthPhaseId,
		upkeepPhaseId,
		payUpkeepStepId,
	};
};

export const createTierCostRules = (): RuleSet => ({
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
							resourceId: CResource.gold,
							percent: 0.1,
						},
					}),
			)
			.text((text) => text.summary('test.boosted'))
			.build(),
	],
});
