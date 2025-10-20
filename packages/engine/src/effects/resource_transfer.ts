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

type TransferRoundingMode = 'up' | 'down' | 'nearest';

function applyRounding(
	value: number,
	mode: TransferRoundingMode | undefined,
): number {
	if (mode === 'up') {
		return value >= 0 ? Math.ceil(value) : Math.floor(value);
	}
	if (mode === 'down' || mode === undefined) {
		return value >= 0 ? Math.floor(value) : Math.ceil(value);
	}
	return Math.round(value);
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
	let amount: number;

	if (requestedAmount !== undefined) {
		const modifiers: ResourceGain[] = [{ key, amount: requestedAmount }];
		context.passives.runEvaluationMods(
			TRANSFER_AMT_EVALUATION_TARGET,
			context,
			modifiers,
		);
		amount = applyRounding(modifiers[0]!.amount, effect.round);
	} else {
		const basePercent = requestedPercent ?? 25;
		const modifiers: ResourceGain[] = [{ key, amount: basePercent }];
		context.passives.runEvaluationMods(
			TRANSFER_PCT_EVALUATION_TARGET,
			context,
			modifiers,
		);
		const percent = modifiers[0]!.amount;
		const raw = (available * percent) / 100;
		amount = applyRounding(raw, effect.round);
	}

	if (amount < 0) {
		amount = 0;
	}
	if (amount > available) {
		amount = available;
	}
	defender.resources[key] = available - amount;
	attacker.resources[key] = (attacker.resources[key] || 0) + amount;
	context.services.handleResourceChange(context, defender, key);
	context.services.handleResourceChange(context, attacker, key);
};
