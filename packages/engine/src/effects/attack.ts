import type { EffectDef, EffectHandler } from '.';
import type { EngineContext } from '../context';
import type { PlayerState, ResourceKey, StatKey } from '../state';
import type { ResourceGain } from '../services';
import { runEffects } from '.';
import { collectTriggerEffects } from '../triggers';
import { withStatSourceFrames } from '../stat_sources';
import { snapshotPlayer, type PlayerSnapshot } from '../log';
import type { AttackEvaluationTargetLog, AttackTarget } from './attack.types';
import {
	attackTargetHandlers,
	type AttackTargetHandlerMeta,
} from './attack_target_handlers';

export {
	type AttackTarget,
	type AttackEvaluationTargetLog,
} from './attack.types';

export interface AttackCalcOptions {
	ignoreAbsorption?: boolean;
	ignoreFortification?: boolean;
}

export type AttackLogOwner = 'attacker' | 'defender';

export interface AttackPowerLog {
	base: number;
	modified: number;
}

export interface AttackEvaluationLog {
	power: AttackPowerLog;
	absorption: {
		ignored: boolean;
		before: number;
		damageAfter: number;
	};
	fortification: {
		ignored: boolean;
		before: number;
		damage: number;
		after: number;
	};
	target: AttackEvaluationTargetLog;
}

interface AttackResourceDiff {
	type: 'resource';
	key: ResourceKey;
	before: number;
	after: number;
}

interface AttackStatDiff {
	type: 'stat';
	key: StatKey;
	before: number;
	after: number;
}

export type AttackPlayerDiff = AttackResourceDiff | AttackStatDiff;

export interface AttackOnDamageLogEntry {
	owner: AttackLogOwner;
	effect: EffectDef;
	attacker: AttackPlayerDiff[];
	defender: AttackPlayerDiff[];
}

export interface AttackLog {
	evaluation: AttackEvaluationLog;
	onDamage: AttackOnDamageLogEntry[];
}

interface AttackResolution {
	damageDealt: number;
	evaluation: AttackEvaluationLog;
}

function diffPlayerSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): AttackPlayerDiff[] {
	const diffs: AttackPlayerDiff[] = [];
	const resourceEntries = {
		...before.resources,
		...after.resources,
	};
	const resourceKeys = new Set<ResourceKey>(
		// Cast snapshot keys to ResourceKey so downstream consumers
		// can rely on resource metadata lookups during logging.
		// eslint-disable-next-line
		Object.keys(resourceEntries) as ResourceKey[],
	);
	for (const key of resourceKeys) {
		const beforeVal = before.resources[key] ?? 0;
		const afterVal = after.resources[key] ?? 0;
		if (beforeVal !== afterVal) {
			diffs.push({
				type: 'resource',
				key,
				before: beforeVal,
				after: afterVal,
			});
		}
	}
	const statEntries = {
		...before.stats,
		...after.stats,
	};
	const statKeys = new Set<StatKey>(
		// eslint-disable-next-line
		Object.keys(statEntries) as StatKey[],
	);
	for (const key of statKeys) {
		const beforeVal = before.stats[key] ?? 0;
		const afterVal = after.stats[key] ?? 0;
		if (beforeVal !== afterVal) {
			diffs.push({
				type: 'stat',
				key,
				before: beforeVal,
				after: afterVal,
			});
		}
	}
	return diffs;
}

function applyAbsorption(
	damage: number,
	absorption: number,
	rounding: 'up' | 'down' | 'nearest',
): number {
	if (absorption <= 0) {
		return damage;
	}
	const reduced = damage * (1 - absorption);
	if (rounding === 'down') {
		return Math.floor(reduced);
	}
	if (rounding === 'up') {
		return Math.ceil(reduced);
	}
	return Math.round(reduced);
}

export function resolveAttack(
	defender: PlayerState,
	damage: number,
	context: EngineContext,
	target: AttackTarget,
	options: AttackCalcOptions = {},
	baseDamage = damage,
): AttackResolution {
	const original = context.game.currentPlayerIndex;
	const defenderIndex = context.game.players.indexOf(defender);

	context.game.currentPlayerIndex = defenderIndex;
	const beforeTriggers = collectTriggerEffects(
		'onBeforeAttacked',
		context,
		defender,
	);

	for (const bundle of beforeTriggers) {
		withStatSourceFrames(context, bundle.frames, () =>
			runEffects(bundle.effects, context),
		);
	}

	if (beforeTriggers.length) {
		runEffects(beforeTriggers, context);
	}

	context.game.currentPlayerIndex = original;

	const absorption = options.ignoreAbsorption
		? 0
		: Math.min(
				(defender.absorption as number) || 0,
				context.services.rules.absorptionCapPct,
			);
	const damageAfterAbsorption = options.ignoreAbsorption
		? damage
		: applyAbsorption(
				damage,
				absorption,
				context.services.rules.absorptionRounding,
			);

	const fortBefore = (defender.fortificationStrength as number) || 0;
	const fortDamage = options.ignoreFortification
		? 0
		: Math.min(fortBefore, damageAfterAbsorption);
	const fortAfter = options.ignoreFortification
		? fortBefore
		: Math.max(0, fortBefore - fortDamage);
	if (!options.ignoreFortification) {
		defender.fortificationStrength = fortAfter;
	}

	const targetDamage = Math.max(0, damageAfterAbsorption - fortDamage);
	const handlerMeta: AttackTargetHandlerMeta = {
		defenderIndex,
		originalIndex: original,
	};
	const handler = attackTargetHandlers[target.type];
	const mutation = handler.applyDamage(
		target as never,
		targetDamage,
		context,
		defender,
		handlerMeta,
	);
	const targetLog = handler.buildLog(
		target as never,
		targetDamage,
		context,
		defender,
		handlerMeta,
		mutation as never,
	);

	context.game.currentPlayerIndex = defenderIndex;
	const afterTriggers = collectTriggerEffects(
		'onAttackResolved',
		context,
		defender,
	);

	for (const bundle of afterTriggers) {
		withStatSourceFrames(context, bundle.frames, () =>
			runEffects(bundle.effects, context),
		);
	}

	if ((defender.fortificationStrength || 0) < 0) {
		defender.fortificationStrength = 0;
	}

	if (afterTriggers.length) {
		runEffects(afterTriggers, context);
	}

	context.game.currentPlayerIndex = original;

	return {
		damageDealt: targetDamage,
		evaluation: {
			power: { base: baseDamage, modified: damage },
			absorption: {
				ignored: Boolean(options.ignoreAbsorption),
				before: absorption,
				damageAfter: damageAfterAbsorption,
			},
			fortification: {
				ignored: Boolean(options.ignoreFortification),
				before: fortBefore,
				damage: fortDamage,
				after: fortAfter,
			},
			target: targetLog,
		},
	};
}

export const attackPerform: EffectHandler = (effect, context) => {
	const attacker = context.activePlayer;
	const defender = context.opponent;
	const params = effect.params || {};
	const target = params['target'] as AttackTarget | undefined;
	if (!target) {
		return;
	}

	const baseDamage = (attacker.armyStrength as number) || 0;
	const targetHandler = attackTargetHandlers[target.type];
	const evaluationKey = targetHandler.getEvaluationModifierKey(target as never);
	const modifiers: ResourceGain[] = [
		{ key: evaluationKey, amount: baseDamage },
	];
	context.passives.runEvaluationModifiers('attack:power', context, modifiers);
	const modifiedDamage = modifiers[0]!.amount;

	const { onDamage, ...calculationOptions } = params as {
		onDamage?: { attacker?: EffectDef[]; defender?: EffectDef[] };
	} & AttackCalcOptions;

	const result = resolveAttack(
		defender,
		modifiedDamage,
		context,
		target,
		calculationOptions,
		baseDamage,
	);

	const onDamageLogs: AttackOnDamageLogEntry[] = [];

	if (result.damageDealt > 0 && onDamage) {
		const runList = (owner: AttackLogOwner, defs: EffectDef[] | undefined) => {
			if (!defs?.length) {
				return;
			}
			const defenderIndex = context.game.players.indexOf(defender);
			const original = context.game.currentPlayerIndex;
			if (owner === 'defender') {
				context.game.currentPlayerIndex = defenderIndex;
			}
			try {
				for (const def of defs) {
					const beforeAttacker = snapshotPlayer(attacker, context);
					const beforeDefender = snapshotPlayer(defender, context);
					runEffects([def], context);
					const afterAttacker = snapshotPlayer(attacker, context);
					const afterDefender = snapshotPlayer(defender, context);
					onDamageLogs.push({
						owner,
						effect: def,
						attacker: diffPlayerSnapshots(beforeAttacker, afterAttacker),
						defender: diffPlayerSnapshots(beforeDefender, afterDefender),
					});
				}
			} finally {
				if (owner === 'defender') {
					context.game.currentPlayerIndex = original;
				}
			}
		};

		runList('defender', onDamage.defender);
		runList('attacker', onDamage.attacker);
	}

	context.pushEffectLog('attack:perform', {
		evaluation: result.evaluation,
		onDamage: onDamageLogs,
	});
};

export default attackPerform;
