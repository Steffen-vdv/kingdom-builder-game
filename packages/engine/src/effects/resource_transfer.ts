import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';
import type { ResourceGain } from '../services';

export const TRANSFER_PCT_EVALUATION_TYPE = 'transfer_pct';
export const TRANSFER_PCT_EVALUATION_ID = 'percent';
export const TRANSFER_PCT_EVALUATION_TARGET = [
	TRANSFER_PCT_EVALUATION_TYPE,
	TRANSFER_PCT_EVALUATION_ID,
].join(':');
export const TRANSFER_AMT_EVALUATION_TYPE = 'transfer_amt';
export const TRANSFER_AMT_EVALUATION_ID = 'amount';
export const TRANSFER_AMT_EVALUATION_TARGET = [
	TRANSFER_AMT_EVALUATION_TYPE,
	TRANSFER_AMT_EVALUATION_ID,
].join(':');

interface TransferParams extends Record<string, unknown> {
	key: ResourceKey;
	percent?: number;
	amount?: number;
}

export const resourceTransfer: EffectHandler<TransferParams> = (
	effect,
	context,
	_multiplier = 1,
) => {
	const {
		key,
		percent: requestedPercent,
		amount: requestedAmount,
	} = effect.params!;
	const defender = context.opponent;
	const attacker = context.activePlayer;
	const available = defender.resources[key] || 0;
	let transferAmount: number;
	if (requestedAmount !== undefined) {
		const modifiers: ResourceGain[] = [{ key, amount: requestedAmount }];
		context.passives.runEvaluationMods(
			TRANSFER_AMT_EVALUATION_TARGET,
			context,
			modifiers,
		);
		const resolved = modifiers[0]?.amount ?? 0;
		transferAmount = Number.isFinite(resolved) ? resolved : 0;
	} else {
		const base = requestedPercent ?? 25;
		const modifiers: ResourceGain[] = [{ key, amount: base }];
		context.passives.runEvaluationMods(
			TRANSFER_PCT_EVALUATION_TARGET,
			context,
			modifiers,
		);
		const percent = modifiers[0]?.amount ?? 0;
		const raw = (available * percent) / 100;
		if (effect.round === 'up') {
			transferAmount = raw >= 0 ? Math.ceil(raw) : Math.floor(raw);
		} else if (effect.round === 'down' || effect.round === undefined) {
			transferAmount = raw >= 0 ? Math.floor(raw) : Math.ceil(raw);
		} else {
			transferAmount = Math.round(raw);
		}
	}
	if (transferAmount < 0) {
		transferAmount = 0;
	}
	if (transferAmount > available) {
		transferAmount = available;
	}
	defender.resources[key] = available - transferAmount;
	attacker.resources[key] = (attacker.resources[key] || 0) + transferAmount;
	context.services.handleResourceChange(context, defender, key);
	context.services.handleResourceChange(context, attacker, key);
};
