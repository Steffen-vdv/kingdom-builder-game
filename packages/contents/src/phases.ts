import { Stat } from './stats';
import { PopulationRole } from './populationRoles';
import {
	effect,
	phase,
	step,
	populationEvaluator,
	statParams,
	compareEvaluator,
	statEvaluator,
	type PhaseDef,
} from './config/builders';
import { Types, StatMethods } from './config/builderShared';
import {
	ON_GAIN_AP_STEP,
	ON_GAIN_INCOME_STEP,
	ON_PAY_UPKEEP_STEP,
	type TriggerKey,
} from './defs';

export const PhaseId = {
	Growth: 'growth',
	Upkeep: 'upkeep',
	Main: 'main',
} as const;

export type PhaseId = (typeof PhaseId)[keyof typeof PhaseId];

export const PhaseStepId = {
	ResolveDynamicTriggers: 'resolve-dynamic-triggers',
	GainIncome: 'gain-income',
	GainActionPoints: 'gain-ap',
	RaiseStrength: 'raise-strength',
	PayUpkeep: 'pay-upkeep',
	WarRecovery: 'war-recovery',
	Main: 'main',
} as const;

export type PhaseStepId = (typeof PhaseStepId)[keyof typeof PhaseStepId];

export const PhaseTrigger = {
	OnGrowthPhase: 'onGrowthPhase',
	OnUpkeepPhase: 'onUpkeepPhase',
} as const satisfies Record<string, TriggerKey>;

export type PhaseTrigger = (typeof PhaseTrigger)[keyof typeof PhaseTrigger];

export const PHASES: PhaseDef[] = [
	phase(PhaseId.Growth)
		.label('Growth')
		.icon('🏗️')
		.step(
			step(PhaseStepId.ResolveDynamicTriggers)
				.title('Resolve dynamic triggers')
				.triggers(PhaseTrigger.OnGrowthPhase),
		)
		.step(
			step(PhaseStepId.GainIncome)
				.title('Gain Income')
				.icon('💰')
				.triggers(ON_GAIN_INCOME_STEP),
		)
		.step(
			step(PhaseStepId.GainActionPoints)
				.title('Gain Action Points')
				.triggers(ON_GAIN_AP_STEP),
		)
		.step(
			step(PhaseStepId.RaiseStrength)
				.title('Raise Strength')
				.effect(
					effect()
						.evaluator(populationEvaluator().role(PopulationRole.Legion))
						.effect(
							effect(Types.Stat, StatMethods.ADD_PCT)
								.params(
									statParams()
										.key(Stat.armyStrength)
										.percentFromStat(Stat.growth),
								)
								.round('up')
								.build(),
						)
						.build(),
				)
				.effect(
					effect()
						.evaluator(populationEvaluator().role(PopulationRole.Fortifier))
						.effect(
							effect(Types.Stat, StatMethods.ADD_PCT)
								.params(
									statParams()
										.key(Stat.fortificationStrength)
										.percentFromStat(Stat.growth),
								)
								.round('up')
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
			step(PhaseStepId.ResolveDynamicTriggers)
				.title('Resolve dynamic triggers')
				.triggers(PhaseTrigger.OnUpkeepPhase),
		)
		.step(
			step(PhaseStepId.PayUpkeep)
				.title('Pay Upkeep')
				.triggers(ON_PAY_UPKEEP_STEP),
		)
		.step(
			step(PhaseStepId.WarRecovery)
				.title('War recovery')
				.effect(
					effect()
						.evaluator(
							compareEvaluator()
								.left(statEvaluator().key(Stat.warWeariness))
								.operator('gt')
								.right(0),
						)
						.effect(
							effect(Types.Stat, StatMethods.REMOVE)
								.params(statParams().key(Stat.warWeariness).amount(1))
								.build(),
						)
						.build(),
				),
		)
		.build(),
	phase(PhaseId.Main)
		.label('Main')
		.icon('🎯')
		.action()
		.step(step(PhaseStepId.Main).title('Main Phase'))
		.build(),
];
