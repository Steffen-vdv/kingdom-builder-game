import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';
import type { ResourceGain } from '../services';
import { getResourceValue, setResourceValue } from '../resource-v2';

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
		const defenderResourceId = defender.getResourceV2Id(key);
		const attackerResourceId = attacker.getResourceV2Id(key);
		const available = getResourceValue(defender, defenderResourceId);
		if (available >= 0 && amount > available) {
			amount = available;
		}
		const defenderTarget = available - amount;
		const attackerCurrent = getResourceValue(attacker, attackerResourceId);
		const attackerTarget = attackerCurrent + amount;
		const catalog = context.resourceCatalogV2;
		if (catalog) {
			setResourceValue(
				context,
				defender,
				catalog,
				defenderResourceId,
				defenderTarget,
			);
			setResourceValue(
				context,
				attacker,
				catalog,
				attackerResourceId,
				attackerTarget,
			);
		} else {
			defender.resourceValues[defenderResourceId] = defenderTarget;
			attacker.resourceValues[attackerResourceId] = attackerTarget;
		}
		context.services.handleResourceChange(
			context,
			defender,
			defenderResourceId,
		);
		context.services.handleResourceChange(
			context,
			attacker,
			attackerResourceId,
		);
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
	const defenderResourceId = defender.getResourceV2Id(key);
	const attackerResourceId = attacker.getResourceV2Id(key);
	const available = getResourceValue(defender, defenderResourceId);
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
	const defenderTarget = available - amount;
	const attackerCurrent = getResourceValue(attacker, attackerResourceId);
	const attackerTarget = attackerCurrent + amount;
	const catalog = context.resourceCatalogV2;
	if (catalog) {
		setResourceValue(
			context,
			defender,
			catalog,
			defenderResourceId,
			defenderTarget,
		);
		setResourceValue(
			context,
			attacker,
			catalog,
			attackerResourceId,
			attackerTarget,
		);
	} else {
		defender.resourceValues[defenderResourceId] = defenderTarget;
		attacker.resourceValues[attackerResourceId] = attackerTarget;
	}
	context.services.handleResourceChange(context, defender, defenderResourceId);
	context.services.handleResourceChange(context, attacker, attackerResourceId);
};
