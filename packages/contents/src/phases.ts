import { Stat, PopulationRole, Resource } from './internal';
import { effect, phase, step, compareEvaluator, resourceEvaluator, type PhaseDef } from './config/builders';
import { Types, ResourceMethods } from './config/builderShared';
import { resourcePercentFromResourceChange, resourceAmountChange } from './helpers/resourceEffects';
import { resourceChange } from './resource';
import { Trigger } from './triggers';
import { PhaseId, PhaseStepId } from './phaseTypes';

// Population upkeep costs (gold per population member per turn)
const COUNCIL_UPKEEP = 2;
const LEGION_UPKEEP = 1;
const FORTIFIER_UPKEEP = 1;

// Population AP gain (AP per council member per turn)
const COUNCIL_AP_GAIN = 1;

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
		.step(
			step(PhaseStepId.GainActionPoints)
				.title('Gain Action Points')
				.triggers(Trigger.GAIN_AP)
				.effect(
					effect()
						.evaluator(resourceEvaluator().resourceId(PopulationRole.Council))
						.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.ap, COUNCIL_AP_GAIN)).build())
						.build(),
				),
		)
		.step(
			step(PhaseStepId.RaiseStrength)
				.title('Raise Strength')
				.effect(
					effect()
						.evaluator(resourceEvaluator().resourceId(PopulationRole.Legion))
						.effect(
							effect(Types.Resource, ResourceMethods.ADD)
								.params(resourcePercentFromResourceChange(Stat.armyStrength, Stat.growth, { roundingMode: 'up', additive: true }))
								.build(),
						)
						.build(),
				)
				.effect(
					effect()
						.evaluator(resourceEvaluator().resourceId(PopulationRole.Fortifier))
						.effect(
							effect(Types.Resource, ResourceMethods.ADD)
								.params(resourcePercentFromResourceChange(Stat.fortificationStrength, Stat.growth, { roundingMode: 'up', additive: true }))
								.build(),
						)
						.build(),
				),
		)
		.build(),
	phase(PhaseId.Upkeep)
		.label('Upkeep')
		.icon('🧹')
		.step(
			step(PhaseStepId.PayUpkeep)
				.title('Pay Upkeep')
				.triggers(Trigger.PAY_UPKEEP)
				.effect(
					effect()
						.evaluator(resourceEvaluator().resourceId(PopulationRole.Council))
						.effect(effect(Types.Resource, ResourceMethods.REMOVE).params(resourceAmountChange(Resource.gold, COUNCIL_UPKEEP)).build())
						.build(),
				)
				.effect(
					effect()
						.evaluator(resourceEvaluator().resourceId(PopulationRole.Legion))
						.effect(effect(Types.Resource, ResourceMethods.REMOVE).params(resourceAmountChange(Resource.gold, LEGION_UPKEEP)).build())
						.build(),
				)
				.effect(
					effect()
						.evaluator(resourceEvaluator().resourceId(PopulationRole.Fortifier))
						.effect(effect(Types.Resource, ResourceMethods.REMOVE).params(resourceAmountChange(Resource.gold, FORTIFIER_UPKEEP)).build())
						.build(),
				),
		)
		.step(
			step(PhaseStepId.WarRecovery)
				.title('War recovery')
				.effect(
					effect()
						.evaluator(compareEvaluator().left(resourceEvaluator().resourceId(Stat.warWeariness)).operator('gt').right(0))
						.effect(effect(Types.Resource, ResourceMethods.REMOVE).params(resourceChange(Stat.warWeariness).amount(1).build()).build())
						.build(),
				),
		)
		.build(),
	phase(PhaseId.Main).label('Main').icon('🎯').action().step(step(PhaseStepId.Main).title('Main Phase')).build(),
];
