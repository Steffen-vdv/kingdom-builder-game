import type { EffectHandler } from '.';
import type { CostModifierResult } from '../services/passive_types';

interface CostModParams {
	id: string;
	actionId?: string;
	resourceId: string;
	amount?: number;
	percent?: number;
	[key: string]: unknown;
}

export const costMod: EffectHandler<CostModParams> = (effect, context) => {
	const params = effect.params || ({} as CostModParams);
	const { id, actionId, resourceId } = params;
	const rawAmount = params['amount'];
	const amount = typeof rawAmount === 'number' ? rawAmount : undefined;
	const rawPercent = params['percent'];
	const percent = typeof rawPercent === 'number' ? rawPercent : undefined;
	if (!id || !resourceId || (amount === undefined && percent === undefined)) {
		throw new Error(
			'cost_mod requires id, resourceId, and at least amount or percent',
		);
	}
	const ownerId = context.activePlayer.id;
	const modId = `${id}_${ownerId}`;
	if (effect.method === 'add') {
		context.passives.registerCostModifier(
			modId,
			(targetActionId, costs, innerContext) => {
				if (
					innerContext.activePlayer.id !== ownerId ||
					(actionId && targetActionId !== actionId)
				) {
					return;
				}
				let flat: Record<string, number> | undefined;
				if (amount !== undefined) {
					flat = { [resourceId]: amount };
				}
				let percentMap: Record<string, number> | undefined;
				if (percent !== undefined) {
					percentMap = { [resourceId]: percent };
				}
				if (!flat && !percentMap) {
					return;
				}
				const result: CostModifierResult = {};
				if (flat) {
					result.flat = flat;
				}
				if (percentMap) {
					result.percent = percentMap;
				}
				if (effect.round) {
					result.round = effect.round;
				}
				return result;
			},
		);
	} else if (effect.method === 'remove') {
		context.passives.unregisterCostModifier(modId);
	}
};
