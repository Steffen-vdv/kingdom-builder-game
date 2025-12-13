import { Resource } from './internal';
import { effect, phase, step, compareEvaluator, resourceEvaluator, type PhaseDef } from './infrastructure/builders';
import { Types, ResourceMethods } from './infrastructure/builderShared';
import { resourcePercentFromResourceChange } from './infrastructure/helpers/resourceEffects';
import { resourceChange } from './resource';
import { Trigger } from './triggers';
import { PhaseId, PhaseStepId } from './phaseTypes';

export { PhaseId, PhaseStepId };
export type { PhaseId as PhaseIdValue, PhaseStepId as PhaseStepIdValue } from './phaseTypes';

// ═══════════════════════════════════════════════════════════════════════════
// PHASE DEFINITIONS
//
// NOTE: When adding a new step that content should be able to hook into,
// also add it to TRIGGER_META in triggers.ts so web can display it properly.
// ═══════════════════════════════════════════════════════════════════════════

export const PHASES: PhaseDef[] = [
	phase(PhaseId.Growth)
		.label('Growth')
		.icon('🌳')
		.step(step(PhaseStepId.GainIncome).title('Gain Income').icon('💰').triggers(Trigger.GAIN_INCOME))
		.step(step(PhaseStepId.GainActionPoints).title('Gain Action Points').triggers(Trigger.GAIN_AP))
		.step(
			step(PhaseStepId.RaiseStrength)
				.title('Raise Strength')
				.effect(
					effect()
						.evaluator(resourceEvaluator().resourceId(Resource.legion))
						.effect(
							effect(Types.Resource, ResourceMethods.ADD)
								.params(resourcePercentFromResourceChange(Resource.armyStrength, Resource.growth, { roundingMode: 'up', additive: true }))
								.build(),
						)
						.build(),
				)
				.effect(
					effect()
						.evaluator(resourceEvaluator().resourceId(Resource.fortifier))
						.effect(
							effect(Types.Resource, ResourceMethods.ADD)
								.params(resourcePercentFromResourceChange(Resource.fortificationStrength, Resource.growth, { roundingMode: 'up', additive: true }))
								.build(),
						)
						.build(),
				),
		)
		.build(),
	phase(PhaseId.Upkeep)
		.label('Upkeep')
		.icon('🧹')
		.step(step(PhaseStepId.PayUpkeep).title('Pay Upkeep').triggers(Trigger.PAY_UPKEEP))
		.step(
			step(PhaseStepId.WarRecovery)
				.title('War recovery')
				.effect(
					effect()
						.evaluator(compareEvaluator().left(resourceEvaluator().resourceId(Resource.warWeariness)).operator('gt').right(0))
						.effect(effect(Types.Resource, ResourceMethods.REMOVE).params(resourceChange(Resource.warWeariness).amount(1).build()).build())
						.build(),
				),
		)
		.build(),
	phase(PhaseId.Main).label('Main').icon('🎯').action().step(step(PhaseStepId.Main).title('Main Phase')).build(),
];
