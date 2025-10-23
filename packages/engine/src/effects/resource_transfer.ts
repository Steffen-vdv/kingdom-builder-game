import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';
import type { ResourceGain } from '../services';

export const TRANSFER_PCT_EVALUATION_TYPE = 'transfer_pct';
export const TRANSFER_PCT_EVALUATION_ID = 'percent';
export const TRANSFER_PCT_EVALUATION_TARGET = [
	TRANSFER_PCT_EVALUATION_TYPE,
	TRANSFER_PCT_EVALUATION_ID,
].join(':');
export const TRANSFER_AMOUNT_EVALUATION_TYPE = 'transfer_amount';
export const TRANSFER_AMOUNT_EVALUATION_ID = 'amount';
export const TRANSFER_AMOUNT_EVALUATION_TARGET = [
	TRANSFER_AMOUNT_EVALUATION_TYPE,
	TRANSFER_AMOUNT_EVALUATION_ID,
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
	if (requestedAmount !== undefined) {
		const modifiers: ResourceGain[] = [{ key, amount: requestedAmount }];
		context.passives.runEvaluationMods(
			TRANSFER_AMOUNT_EVALUATION_TARGET,
			context,
			modifiers,
		);
		let amount = modifiers[0]!.amount;
		if (amount < 0) {
			amount = 0;
		}
		const defender = context.opponent;
		const attacker = context.activePlayer;
		const available = defender.resources[key] || 0;
		if (available >= 0 && amount > available) {
			amount = available;
		}
		defender.resources[key] = available - amount;
		attacker.resources[key] = (attacker.resources[key] || 0) + amount;
		if (amount > 0) {
			context.recentResourceGains.push({ key, amount: -amount });
			context.recentResourceGains.push({ key, amount });
		}
		context.services.handleResourceChange(context, defender, key);
		context.services.handleResourceChange(context, attacker, key);
		return;
	}
	const base = requestedPercent ?? 25;
	const modifiers: ResourceGain[] = [{ key, amount: base }];
	context.passives.runEvaluationMods(
		TRANSFER_PCT_EVALUATION_TARGET,
		context,
		modifiers,
	);
	const percent = modifiers[0]!.amount;
	const defender = context.opponent;
	const attacker = context.activePlayer;
	const available = defender.resources[key] || 0;
	const raw = (available * percent) / 100;
	let amount: number;
	if (effect.round === 'up') {
		amount = raw >= 0 ? Math.ceil(raw) : Math.floor(raw);
	} else if (effect.round === 'down' || effect.round === undefined) {
		amount = raw >= 0 ? Math.floor(raw) : Math.ceil(raw);
	} else {
		amount = Math.round(raw);
	}
	if (amount < 0) {
		amount = 0;
	}
	if (available >= 0 && amount > available) {
		amount = available;
	}
	defender.resources[key] = available - amount;
	attacker.resources[key] = (attacker.resources[key] || 0) + amount;
	if (amount > 0) {
		context.recentResourceGains.push({ key, amount: -amount });
		context.recentResourceGains.push({ key, amount });
	}
	context.services.handleResourceChange(context, defender, key);
	context.services.handleResourceChange(context, attacker, key);
};
