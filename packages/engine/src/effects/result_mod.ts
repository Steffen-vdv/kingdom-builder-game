import type { EffectHandler } from '.';
import { runEffects } from '.';
import type { EvaluationModifierResult } from '../services/passive_types';

interface ResultModParams {
	id: string;
	actionId?: string;
	evaluation?: { type: string; id: string };
	amount?: number;
	adjust?: number;
	percent?: number;
	[key: string]: unknown;
}

export const resultMod: EffectHandler<ResultModParams> = (effect, ctx) => {
	const params = effect.params || ({} as ResultModParams);
	const { id, actionId, evaluation } = params;
	if (!id || (!actionId && !evaluation)) {
		throw new Error('result_mod requires id and actionId or evaluation');
	}
	const ownerId = ctx.activePlayer.id;
	const modId = `${id}_${ownerId}`;
	if (effect.method === 'add') {
		const effects = effect.effects || [];
		if (actionId) {
			ctx.passives.registerResultModifier(
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
			const target = `${evaluation.type}:${evaluation.id}`;
			const rawAmount = params['amount'];
			const amount = typeof rawAmount === 'number' ? rawAmount : undefined;
			const rawAdjust = params['adjust'];
			const adjust = typeof rawAdjust === 'number' ? rawAdjust : undefined;
			const rawPercent = params['percent'];
			const percent = typeof rawPercent === 'number' ? rawPercent : undefined;
			ctx.passives.registerEvaluationModifier(
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
						for (const g of gains) {
							g.amount += adjust;
						}
					}
					if (amount !== undefined) {
						for (const g of gains) {
							if (g.amount > 0) {
								runEffects(
									[
										{
											type: 'resource',
											method: 'add',
											params: { key: g.key, amount },
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
			ctx.passives.unregisterResultModifier(modId);
		} else if (evaluation) {
			ctx.passives.unregisterEvaluationModifier(modId);
		}
	}
};
