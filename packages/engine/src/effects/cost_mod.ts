import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';

interface CostModParams {
	id: string;
	actionId?: string;
	key: ResourceKey;
	amount?: number;
	percent?: number;
	[key: string]: unknown;
}

export const costMod: EffectHandler<CostModParams> = (effect, ctx) => {
	const params = effect.params || ({} as CostModParams);
	const { id, actionId, key } = params;
	const rawAmount = params['amount'];
	const amount = typeof rawAmount === 'number' ? rawAmount : undefined;
	const rawPercent = params['percent'];
	const percent = typeof rawPercent === 'number' ? rawPercent : undefined;
	if (!id || !key || (amount === undefined && percent === undefined)) {
		throw new Error(
			'cost_mod requires id, key, and at least amount or percent',
		);
	}
	const ownerId = ctx.activePlayer.id;
	const modId = `${id}_${ownerId}`;
	if (effect.method === 'add') {
		ctx.passives.registerCostModifier(
			modId,
			(targetActionId, costs, innerCtx) => {
				if (
					innerCtx.activePlayer.id !== ownerId ||
					(actionId && targetActionId !== actionId)
				) {
					return;
				}
				let flat: Record<string, number> | undefined;
				if (amount !== undefined) {
					flat = { [key]: amount };
				}
				let percentMap: Record<string, number> | undefined;
				if (percent !== undefined) {
					percentMap = { [key]: percent };
				}
				if (!flat && !percentMap) {
					return;
				}
				const result: {
					flat?: Record<string, number>;
					percent?: Record<string, number>;
				} = {};
				if (flat) {
					result.flat = flat;
				}
				if (percentMap) {
					result.percent = percentMap;
				}
				return result;
			},
		);
	} else if (effect.method === 'remove') {
		ctx.passives.unregisterCostModifier(modId);
	}
};
