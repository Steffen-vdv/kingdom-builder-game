import type { RuleSet } from '@kingdom-builder/engine/services';
import { Resource } from './resources';
import { happinessTier, tierPassive } from './config/builders';

export const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: Resource.happiness,
	tierDefinitions: [
		happinessTier('happiness:tier:steady')
			.range(0, 2)
			.incomeMultiplier(1)
			.passive(
				tierPassive('passive:happiness:steady').text((text) =>
					text
						.summary('passive.happiness.steady.summary')
						.removal('passive.happiness.steady.removal'),
				),
			)
			.display((display) =>
				display.removalCondition('passive.happiness.steady.removal'),
			)
			.build(),
		happinessTier('happiness:tier:content')
			.range(3, 4)
			.incomeMultiplier(1.25)
			.passive(
				tierPassive('passive:happiness:content').text((text) =>
					text
						.summary('passive.happiness.content.summary')
						.removal('passive.happiness.content.removal'),
				),
			)
			.display((display) =>
				display.removalCondition('passive.happiness.content.removal'),
			)
			.build(),
		happinessTier('happiness:tier:joyful')
			.range(5, 7)
			.incomeMultiplier(1.25)
			.buildingDiscountPct(0.2)
			.passive(
				tierPassive('passive:happiness:joyful').text((text) =>
					text
						.summary('passive.happiness.joyful.summary')
						.removal('passive.happiness.joyful.removal'),
				),
			)
			.display((display) =>
				display.removalCondition('passive.happiness.joyful.removal'),
			)
			.build(),
		happinessTier('happiness:tier:elated')
			.range(8)
			.incomeMultiplier(1.5)
			.buildingDiscountPct(0.2)
			.passive(
				tierPassive('passive:happiness:elated').text((text) =>
					text
						.summary('passive.happiness.elated.summary')
						.removal('passive.happiness.elated.removal'),
				),
			)
			.display((display) =>
				display.removalCondition('passive.happiness.elated.removal'),
			)
			.build(),
	],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 2,
	basePopulationCap: 1,
};
