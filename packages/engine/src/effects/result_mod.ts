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
			const target = `${evaluation.type}:${evaluation.id}`;
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
								// key IS the ResourceV2 ID directly (no mapper needed)
								runEffects(
									[
										{
											type: 'resource',
											method: 'add',
											params: {
												resourceId: gainEntry.key,
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
