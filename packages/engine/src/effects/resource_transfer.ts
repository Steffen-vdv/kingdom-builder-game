import type { ResourceV2Transfer } from '@kingdom-builder/protocol';
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
	const resourceService = context.services.resourceV2;
	const defender = context.opponent;
	const attacker = context.activePlayer;
	if (resourceService.hasDefinition(key)) {
		if (requestedAmount !== undefined) {
			const modifiers: ResourceGain[] = [{ key, amount: requestedAmount }];
			context.passives.runEvaluationMods(
				TRANSFER_AMOUNT_EVALUATION_TARGET,
				context,
				modifiers,
			);
			const initial = modifiers[0]?.amount ?? 0;
			let amount = initial;
			if (amount < 0) {
				amount = 0;
			}
			const available = resourceService.getValue(defender, key);
			if (available >= 0 && amount > available) {
				amount = available;
			}
			if (amount === 0) {
				return;
			}
			const transfer: ResourceV2Transfer = {
				amount,
				from: { resourceId: key },
				to: { resourceId: key },
			};
			resourceService.transferValue(context, defender, attacker, transfer, 1);
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
		const transfer: ResourceV2Transfer = {
			percent,
			from: { resourceId: key },
			to: { resourceId: key },
			...(effect.round ? { rounding: effect.round } : {}),
		};
		resourceService.transferValue(context, defender, attacker, transfer, 1);
		return;
	}
	if (requestedAmount !== undefined) {
		const modifiers: ResourceGain[] = [{ key, amount: requestedAmount }];
		context.passives.runEvaluationMods(
			TRANSFER_AMOUNT_EVALUATION_TARGET,
			context,
			modifiers,
		);
		const initial = modifiers[0]?.amount ?? 0;
		let amount = initial;
		if (amount < 0) {
			amount = 0;
		}
		const defenderAvailable = defender.resources[key] || 0;
		if (defenderAvailable >= 0 && amount > defenderAvailable) {
			amount = defenderAvailable;
		}
		const defenderBefore = defenderAvailable;
		const attackerBefore = attacker.resources[key] || 0;
		defender.resources[key] = defenderAvailable - amount;
		attacker.resources[key] = attackerBefore + amount;
		context.services.handleResourceChange(context, defender, key);
		context.services.handleResourceChange(context, attacker, key);
		const defenderNext = defender.resources[key] || 0;
		const defenderDelta = defenderNext - defenderBefore;
		if (defenderDelta !== 0) {
			context.recentResourceGains.push({
				key,
				amount: defenderDelta,
				source: 'resource',
			});
		}
		const attackerNext = attacker.resources[key] || 0;
		const attackerDelta = attackerNext - attackerBefore;
		if (attackerDelta !== 0) {
			context.recentResourceGains.push({
				key,
				amount: attackerDelta,
				source: 'resource',
			});
		}
		return;
	}
	const base = requestedPercent ?? 25;
	const modifiers: ResourceGain[] = [{ key, amount: base }];
	context.passives.runEvaluationMods(
		TRANSFER_PCT_EVALUATION_TARGET,
		context,
		modifiers,
	);
	const percent = modifiers[0]?.amount ?? 0;
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
	const defenderBefore = available;
	const attackerBefore = attacker.resources[key] || 0;
	defender.resources[key] = available - amount;
	attacker.resources[key] = attackerBefore + amount;
	context.services.handleResourceChange(context, defender, key);
	context.services.handleResourceChange(context, attacker, key);
	const defenderNext = defender.resources[key] || 0;
	const defenderDelta = defenderNext - defenderBefore;
	if (defenderDelta !== 0) {
		context.recentResourceGains.push({
			key,
			amount: defenderDelta,
			source: 'resource',
		});
	}
	const attackerNext = attacker.resources[key] || 0;
	const attackerDelta = attackerNext - attackerBefore;
	if (attackerDelta !== 0) {
		context.recentResourceGains.push({
			key,
			amount: attackerDelta,
			source: 'resource',
		});
	}
};
