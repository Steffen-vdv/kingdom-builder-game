import { effect, phase, step, resourceEvaluator } from '../infrastructure/builders';
import { Types, ResourceMethods, resourceAmountChange } from '@boardsmith/contents-sdk';
import type { TriggerKey } from '@boardsmith/contents-sdk';
import { Phase, Step, Trigger, Res } from './ids';
import type { PhaseConfig } from '@boardsmith/protocol';

// BSE defines its own trigger key namespace; the protocol
// schema accepts any string, but the builder type is narrow.
const trigger = (id: string) => id as TriggerKey;

export const PHASES: readonly PhaseConfig[] = [
	// ═══════════════════════════════════════════════════════
	// GROWTH PHASE
	// ═══════════════════════════════════════════════════════
	phase(Phase.growth)
		.label('Growth')
		.icon('🌳')
		.step(step(Step.gainIncome).title('Gain Income').triggers(trigger(Trigger.gainIncome)))
		.step(step(Step.raiseStrength).title('Raise Strength'))
		.build(),

	// ═══════════════════════════════════════════════════════
	// UPKEEP PHASE
	// ═══════════════════════════════════════════════════════
	phase(Phase.upkeep)
		.label('Upkeep')
		.icon('🧹')
		.step(
			step(Step.payUpkeep)
				.title('Pay Upkeep')
				.triggers(trigger(Trigger.payUpkeep))
				.effect(
					effect()
						.evaluator(resourceEvaluator().resourceId(Res.population))
						.effect(effect(Types.Resource, ResourceMethods.REMOVE).params(resourceAmountChange(Res.food, 1)).build())
						.build(),
				),
		)
		.step(
			step(Step.foodResolution)
				.title('Food Resolution')
				.effect({
					type: 'conditional',
					method: 'branch',
					params: {
						evaluator: {
							type: 'resource',
							params: {
								resourceId: Res.food,
							},
						},
						operator: 'gte',
						threshold: 0,
						thenEffects: [effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.happiness, 1)).build()],
						elseEffects: [effect(Types.Resource, ResourceMethods.REMOVE).params(resourceAmountChange(Res.happiness, 1)).build()],
					},
				}),
		)
		.step(step(Step.warRecovery).title('War Recovery'))
		.step(
			step(Step.gainAP)
				.title('Gain Action Points')
				.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.ap, 2)).build()),
		)
		.step(
			step(Step.decrementTurns)
				.title('Decrement Turns')
				.effect(effect(Types.Resource, ResourceMethods.REMOVE).params(resourceAmountChange(Res.turnsRemaining, 1)).build()),
		)
		.build(),

	// ═══════════════════════════════════════════════════════
	// MAIN PHASE
	// ═══════════════════════════════════════════════════════
	phase(Phase.main).label('Main').icon('🎯').action().step(step(Step.main).title('Main Phase')).build(),
];
