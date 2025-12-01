import type { StatKey } from './stats';
import type { PopulationRoleId } from './populationRoles';
import { effect, phase, step, populationEvaluator, compareEvaluator, statEvaluator, type PhaseDef } from './config/builders';
import { Types, StatMethods } from './config/builderShared';
import { statAmountChange, statPercentFromStatChange } from './helpers/resourceV2Effects';
import { ON_GAIN_AP_STEP, ON_GAIN_INCOME_STEP, ON_PAY_UPKEEP_STEP } from './defs';
import { PhaseId, PhaseStepId, PhaseTrigger } from './phaseTypes';

export { PhaseId, PhaseStepId, PhaseTrigger };
export type { PhaseId as PhaseIdValue, PhaseStepId as PhaseStepIdValue, PhaseTrigger as PhaseTriggerKey } from './phaseTypes';

const LEGION_ROLE: PopulationRoleId = 'legion';
const FORTIFIER_ROLE: PopulationRoleId = 'fortifier';

const ARMY_STRENGTH_STAT: StatKey = 'armyStrength';
const FORTIFICATION_STRENGTH_STAT: StatKey = 'fortificationStrength';
const GROWTH_STAT: StatKey = 'growth';
const WAR_WEARINESS_STAT: StatKey = 'warWeariness';

export const PHASES: PhaseDef[] = [
	phase(PhaseId.Growth)
		.label('Growth')
		.icon('🌳')
		.step(step(PhaseStepId.ResolveDynamicTriggers).title('Resolve dynamic triggers').triggers(PhaseTrigger.OnGrowthPhase))
		.step(step(PhaseStepId.GainIncome).title('Gain Income').icon('💰').triggers(ON_GAIN_INCOME_STEP))
		.step(step(PhaseStepId.GainActionPoints).title('Gain Action Points').triggers(ON_GAIN_AP_STEP))
		.step(
			step(PhaseStepId.RaiseStrength)
				.title('Raise Strength')
				.effect(
					effect()
						.evaluator(populationEvaluator().role(LEGION_ROLE))
						.effect(effect(Types.Stat, StatMethods.ADD_PCT).params(statPercentFromStatChange(ARMY_STRENGTH_STAT, GROWTH_STAT)).round('up').build())
						.build(),
				)
				.effect(
					effect()
						.evaluator(populationEvaluator().role(FORTIFIER_ROLE))
						.effect(effect(Types.Stat, StatMethods.ADD_PCT).params(statPercentFromStatChange(FORTIFICATION_STRENGTH_STAT, GROWTH_STAT)).round('up').build())
						.build(),
				),
		)
		.build(),
	phase(PhaseId.Upkeep)
		.label('Upkeep')
		.icon('🧹')
		.step(step(PhaseStepId.ResolveDynamicTriggers).title('Resolve dynamic triggers').triggers(PhaseTrigger.OnUpkeepPhase))
		.step(step(PhaseStepId.PayUpkeep).title('Pay Upkeep').triggers(ON_PAY_UPKEEP_STEP))
		.step(
			step(PhaseStepId.WarRecovery)
				.title('War recovery')
				.effect(
					effect()
						.evaluator(compareEvaluator().left(statEvaluator().key(WAR_WEARINESS_STAT)).operator('gt').right(0))
						.effect(effect(Types.Stat, StatMethods.REMOVE).params(statAmountChange(WAR_WEARINESS_STAT, 1)).build())
						.build(),
				),
		)
		.build(),
	phase(PhaseId.Main).label('Main').icon('🎯').action().step(step(PhaseStepId.Main).title('Main Phase')).build(),
];
