import type { EffectHandler } from '.';
import { runEffects } from '.';
import type { EvaluationModifierResult } from '../services/passive_types';
import { GLOBAL_EVALUATION_TARGET } from '../services/evaluation_modifier_service';

/**
 * Supported effect types for evaluation modifiers.
 * Currently only 'resource:add' is supported.
 */
export const SUPPORTED_TARGET_EFFECTS = ['resource:add'] as const;
export type TargetEffect = (typeof SUPPORTED_TARGET_EFFECTS)[number];

interface ResultModParams {
	id: string;
	actionId?: string;
	/**
	 * Evaluation target for the modifier.
	 * - Empty `{}` or omitted type/id = global (applies to all resource:add)
	 * - `{ type: 'development' }` = all development evaluators
	 * - `{ type: 'development', id: 'farm' }` = specific development
	 *
	 * `targetEffect` must be specified to indicate which effect type this
	 * modifier acts on. Currently only 'resource:add' is supported.
	 */
	evaluation?: { type?: string; id?: string; targetEffect: TargetEffect };
	amount?: number;
	adjust?: number;
	percent?: number;
	[key: string]: unknown;
}

/**
 * Build the evaluation target string from the evaluation config.
 * - No type = global target '*'
 * - Type but no id = type only (e.g., 'development')
 * - Type and id = full target (e.g., 'development:farm')
 */
function buildEvaluationTarget(evaluation: { type?: string; id?: string }) {
	if (!evaluation.type) {
		return GLOBAL_EVALUATION_TARGET;
	}
	if (!evaluation.id) {
		return evaluation.type;
	}
	return `${evaluation.type}:${evaluation.id}`;
}

export const resultMod: EffectHandler<ResultModParams> = (
	effect,
	engineContext,
) => {
	const params = effect.params || ({} as ResultModParams);
	const { id, actionId, evaluation } = params;
	if (!id || (!actionId && !evaluation)) {
		throw new Error('result_mod requires id and actionId or evaluation');
	}
	const ownerId = engineContext.activePlayer.id;
	const modId = `${id}_${ownerId}`;
	if (effect.method === 'add') {
		const effects = effect.effects || [];
		if (actionId) {
			engineContext.passives.registerResultModifier(
				modId,
				(executedActionId, innerContext) => {
					if (
						executedActionId === actionId &&
						innerContext.activePlayer.id === ownerId
					) {
						runEffects(effects, innerContext);
					}
				},
			);
		} else if (evaluation) {
			// Validate targetEffect is specified and supported
			if (!evaluation.targetEffect) {
				throw new Error(
					'result_mod with evaluation requires targetEffect to be specified. ' +
						`Supported values: ${SUPPORTED_TARGET_EFFECTS.join(', ')}`,
				);
			}
			if (!SUPPORTED_TARGET_EFFECTS.includes(evaluation.targetEffect)) {
				throw new Error(
					`result_mod targetEffect "${evaluation.targetEffect}" is not supported. ` +
						`Supported values: ${SUPPORTED_TARGET_EFFECTS.join(', ')}`,
				);
			}
			const target = buildEvaluationTarget(evaluation);
			const rawAmount = params['amount'];
			const amount = typeof rawAmount === 'number' ? rawAmount : undefined;
			const rawAdjust = params['adjust'];
			const adjust = typeof rawAdjust === 'number' ? rawAdjust : undefined;
			const rawPercent = params['percent'];
			const percent = typeof rawPercent === 'number' ? rawPercent : undefined;
			engineContext.passives.registerEvaluationModifier(
				modId,
				target,
				(innerContext, gains) => {
					if (innerContext.activePlayer.id !== ownerId) {
						return;
					}
					if (effects.length) {
						runEffects(effects, innerContext);
					}
					if (adjust !== undefined) {
						for (const gainEntry of gains) {
							gainEntry.amount += adjust;
						}
					}
					if (amount !== undefined) {
						for (const gainEntry of gains) {
							if (gainEntry.amount > 0) {
								// key IS the Resource ID directly (no mapper needed)
								runEffects(
									[
										{
											type: 'resource',
											method: 'add',
											params: {
												resourceId: gainEntry.resourceId,
												change: { type: 'amount', amount },
											},
										},
									],
									innerContext,
								);
							}
						}
					}
					if (percent !== undefined) {
						const modifierResult: EvaluationModifierResult = {
							percent,
						};
						if (effect.round) {
							modifierResult.round = effect.round;
						}
						return modifierResult;
					}
				},
			);
		}
	} else if (effect.method === 'remove') {
		if (actionId) {
			engineContext.passives.unregisterResultModifier(modId);
		} else if (evaluation) {
			engineContext.passives.unregisterEvaluationModifier(modId);
		}
	}
};
