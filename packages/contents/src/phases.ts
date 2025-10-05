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
} from './defs';

export const PHASES: PhaseDef[] = [
	phase('growth')
		.label('Growth')
		.icon('🏗️')
		.step(
			step('resolve-dynamic-triggers')
				.title('Resolve dynamic triggers')
				.triggers('onGrowthPhase'),
		)
		.step(
			step('gain-income')
				.title('Gain Income')
				.icon('💰')
				.triggers(ON_GAIN_INCOME_STEP),
		)
		.step(step('gain-ap').title('Gain Action Points').triggers(ON_GAIN_AP_STEP))
		.step(
			step('raise-strength')
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
	phase('upkeep')
		.label('Upkeep')
		.icon('🧹')
		.step(
			step('resolve-dynamic-triggers')
				.title('Resolve dynamic triggers')
				.triggers('onUpkeepPhase'),
		)
		.step(step('pay-upkeep').title('Pay Upkeep').triggers(ON_PAY_UPKEEP_STEP))
		.step(
			step('war-recovery')
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
	phase('main')
		.label('Main')
		.icon('🎯')
		.action()
		.step(step('main').title('Main Phase'))
		.build(),
];
