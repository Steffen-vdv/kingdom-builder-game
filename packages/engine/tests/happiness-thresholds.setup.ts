import type { RuleSet } from '../src/services';
import type { StartConfig } from '../src/config/schema';
import type { PhaseDef } from '../src/phases';
import { RULES } from '@kingdom-builder/contents';
import {
	happinessTier,
	tierPassive,
	effect,
} from '@kingdom-builder/contents/config/builders';
import { createContentFactory } from './factories/content';
import { createEngine } from '../src';

export function setupHappinessThresholdTest() {
	const content = createContentFactory();
	const tierKey = RULES.tieredResourceKey;
	const phaseId = 'phase:test:growth';
	const stepId = 'step:test:income';
	const lowTierId = 'test:tier:low';
	const highTierId = 'test:tier:high';
	const lowPassiveId = 'test:passive:low';
	const highPassiveId = 'test:passive:high';
	const phases: PhaseDef[] = [
		{
			id: phaseId,
			steps: [{ id: stepId }],
		},
	];
	const rules: RuleSet = {
		...RULES,
		tierDefinitions: [
			happinessTier(lowTierId)
				.range(0, 2)
				.passive(
					tierPassive(lowPassiveId).text((text) =>
						text.summary('token.low.summary').removal('token.low.removal'),
					),
				)
				.display((display) =>
					display.removalCondition('token.low.removal.condition'),
				)
				.build(),
			happinessTier(highTierId)
				.range(3)
				.passive(
					tierPassive(highPassiveId)
						.effect(
							effect('cost_mod', 'add')
								.param('id', 'test:passive:discount')
								.param('key', tierKey)
								.param('percent', -0.2),
						)
						.skipPhase(phaseId)
						.skipStep(phaseId, stepId)
						.text((text) =>
							text.summary('token.high.summary').removal('token.high.removal'),
						),
				)
				.display((display) =>
					display
						.removalCondition('token.high.removalCondition')
						.summaryToken('token.high.summary'),
				)
				.build(),
		],
	};
	const start: StartConfig = {
		player: {
			resources: { [tierKey]: 0 },
			stats: {},
			population: {},
		},
	};
	const action = content.action({
		baseCosts: { [tierKey]: 10 },
	});
	const ctx = createEngine({
		actions: content.actions,
		buildings: content.buildings,
		developments: content.developments,
		populations: content.populations,
		phases,
		start,
		rules,
	});
	return {
		ctx,
		action,
		tierKey,
		phaseId,
		stepId,
		lowTierId,
		highTierId,
		lowPassiveId,
		highPassiveId,
	};
}
