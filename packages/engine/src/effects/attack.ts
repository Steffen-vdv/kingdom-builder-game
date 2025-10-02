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

export type AttackTarget =
	| { type: 'resource'; key: ResourceKey }
	| { type: 'stat'; key: StatKey }
	| { type: 'building'; id: string };

export type AttackLogOwner = 'attacker' | 'defender';

export interface AttackPowerLog {
	base: number;
	modified: number;
}

interface AttackNumericTargetLog {
	before: number;
	damage: number;
	after: number;
}

type AttackResourceEvaluationTargetLog = {
	type: 'resource';
	key: ResourceKey;
} & AttackNumericTargetLog;

type AttackStatEvaluationTargetLog = {
	type: 'stat';
	key: StatKey;
} & AttackNumericTargetLog;

interface AttackBuildingEvaluationTargetLog {
	type: 'building';
	id: string;
	existed: boolean;
	destroyed: boolean;
	damage: number;
}

export type AttackEvaluationTargetLog =
	| AttackResourceEvaluationTargetLog
	| AttackStatEvaluationTargetLog
	| AttackBuildingEvaluationTargetLog;

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

interface AttackResourcePlayerDiff {
	type: 'resource';
	key: ResourceKey;
	before: number;
	after: number;
}

interface AttackStatPlayerDiff {
	type: 'stat';
	key: StatKey;
	before: number;
	after: number;
}

export type AttackPlayerDiff = AttackResourcePlayerDiff | AttackStatPlayerDiff;

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
	const resourceKeys = new Set<ResourceKey>(
		// Cast snapshot keys to ResourceKey so downstream consumers can rely on
		// resource metadata lookups during logging.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		Object.keys({ ...before.resources, ...after.resources }) as ResourceKey[],
	);
	for (const key of resourceKeys) {
		const beforeVal = before.resources[key] ?? 0;
		const afterVal = after.resources[key] ?? 0;
		if (beforeVal !== afterVal)
			diffs.push({
				type: 'resource',
				key,
				before: beforeVal,
				after: afterVal,
			});
	}
	const statKeys = new Set<StatKey>(
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		Object.keys({ ...before.stats, ...after.stats }) as StatKey[],
	);
	for (const key of statKeys) {
		const beforeVal = before.stats[key] ?? 0;
		const afterVal = after.stats[key] ?? 0;
		if (beforeVal !== afterVal)
			diffs.push({
				type: 'stat',
				key,
				before: beforeVal,
				after: afterVal,
			});
	}
	return diffs;
}

function applyAbsorption(
	damage: number,
	absorption: number,
	rounding: 'up' | 'down' | 'nearest',
): number {
	if (absorption <= 0) return damage;
	const reduced = damage * (1 - absorption);
	if (rounding === 'down') return Math.floor(reduced);
	if (rounding === 'up') return Math.ceil(reduced);
	return Math.round(reduced);
}

export function resolveAttack(
	defender: PlayerState,
	damage: number,
	ctx: EngineContext,
	target: AttackTarget,
	opts: AttackCalcOptions = {},
	baseDamage = damage,
): AttackResolution {
	const original = ctx.game.currentPlayerIndex;
	const defenderIndex = ctx.game.players.indexOf(defender);

	ctx.game.currentPlayerIndex = defenderIndex;
	const pre = collectTriggerEffects('onBeforeAttacked', ctx, defender);

	for (const bundle of pre)
		withStatSourceFrames(ctx, bundle.frames, () =>
			runEffects(bundle.effects, ctx),
		);

	if (pre.length) runEffects(pre, ctx);

	ctx.game.currentPlayerIndex = original;

	const absorption = opts.ignoreAbsorption
		? 0
		: Math.min(
				(defender.absorption as number) || 0,
				ctx.services.rules.absorptionCapPct,
			);
	const damageAfterAbsorption = opts.ignoreAbsorption
		? damage
		: applyAbsorption(
				damage,
				absorption,
				ctx.services.rules.absorptionRounding,
			);

	const fortBefore = (defender.fortificationStrength as number) || 0;
	const fortDamage = opts.ignoreFortification
		? 0
		: Math.min(fortBefore, damageAfterAbsorption);
	const fortAfter = opts.ignoreFortification
		? fortBefore
		: Math.max(0, fortBefore - fortDamage);
	if (!opts.ignoreFortification) defender.fortificationStrength = fortAfter;

	const targetDamage = Math.max(0, damageAfterAbsorption - fortDamage);
	let targetLog: AttackEvaluationTargetLog;

	if (target.type === 'stat') {
		const before = defender.stats[target.key] || 0;
		const after = Math.max(0, before - targetDamage);
		if (targetDamage > 0) defender.stats[target.key] = after;
		targetLog = {
			type: 'stat',
			key: target.key,
			before,
			damage: targetDamage,
			after,
		};
	} else if (target.type === 'resource') {
		const before = defender.resources[target.key] || 0;
		const after = Math.max(0, before - targetDamage);
		if (targetDamage > 0) defender.resources[target.key] = after;
		targetLog = {
			type: 'resource',
			key: target.key,
			before,
			damage: targetDamage,
			after,
		};
	} else {
		const existed = defender.buildings.has(target.id);
		let destroyed = false;
		if (targetDamage > 0 && existed) {
			const originalIndex = ctx.game.currentPlayerIndex;
			ctx.game.currentPlayerIndex = defenderIndex;
			try {
				runEffects(
					[
						{
							type: 'building',
							method: 'remove',
							params: { id: target.id },
						},
					],
					ctx,
				);
			} finally {
				ctx.game.currentPlayerIndex = originalIndex;
			}
			destroyed = !defender.buildings.has(target.id);
		}
		targetLog = {
			type: 'building',
			id: target.id,
			existed,
			destroyed,
			damage: targetDamage,
		};
	}

	const handlerMeta: AttackTargetHandlerMeta = {
		defenderIndex,
		originalIndex: original,
	};
	const handler = attackTargetHandlers[target.type];
	const mutation = handler.applyDamage(
		target as never,
		targetDamage,
		ctx,
		defender,
		handlerMeta,
	);
	const targetLog = handler.buildLog(
		target as never,
		targetDamage,
		ctx,
		defender,
		handlerMeta,
		mutation as never,
	);

	ctx.game.currentPlayerIndex = defenderIndex;
	const post = collectTriggerEffects('onAttackResolved', ctx, defender);

	for (const bundle of post)
		withStatSourceFrames(ctx, bundle.frames, () =>
			runEffects(bundle.effects, ctx),
		);

	if ((defender.fortificationStrength || 0) < 0)
		defender.fortificationStrength = 0;

	if (post.length) runEffects(post, ctx);

	ctx.game.currentPlayerIndex = original;
	ctx.services.happinessThresholds.syncPlayer(ctx, defender);

	return {
		damageDealt: targetDamage,
		evaluation: {
			power: { base: baseDamage, modified: damage },
			absorption: {
				ignored: Boolean(opts.ignoreAbsorption),
				before: absorption,
				damageAfter: damageAfterAbsorption,
			},
			fortification: {
				ignored: Boolean(opts.ignoreFortification),
				before: fortBefore,
				damage: fortDamage,
				after: fortAfter,
			},
			target: targetLog,
		},
	};
}

export const attackPerform: EffectHandler = (effect, ctx) => {
	const attacker = ctx.activePlayer;
	const defender = ctx.opponent;
	const params = effect.params || {};
	const target = params['target'] as AttackTarget | undefined;
	if (!target) return;

	const baseDamage = (attacker.armyStrength as number) || 0;
	const evaluationKey = target.type === 'building' ? target.id : target.key;
	const mods: ResourceGain[] = [{ key: evaluationKey, amount: baseDamage }];
	ctx.passives.runEvaluationMods('attack:power', ctx, mods);
	const modifiedDamage = mods[0]!.amount;

	const { onDamage, ...calcOpts } = params as {
		onDamage?: { attacker?: EffectDef[]; defender?: EffectDef[] };
	} & AttackCalcOptions;

	const result = resolveAttack(
		defender,
		modifiedDamage,
		ctx,
		target,
		calcOpts,
		baseDamage,
	);

	const onDamageLogs: AttackOnDamageLogEntry[] = [];

	if (result.damageDealt > 0 && onDamage) {
		const runList = (owner: AttackLogOwner, defs: EffectDef[] | undefined) => {
			if (!defs?.length) return;
			const defenderIndex = ctx.game.players.indexOf(defender);
			const original = ctx.game.currentPlayerIndex;
			if (owner === 'defender') ctx.game.currentPlayerIndex = defenderIndex;
			try {
				for (const def of defs) {
					const beforeAttacker = snapshotPlayer(attacker, ctx);
					const beforeDefender = snapshotPlayer(defender, ctx);
					runEffects([def], ctx);
					const afterAttacker = snapshotPlayer(attacker, ctx);
					const afterDefender = snapshotPlayer(defender, ctx);
					onDamageLogs.push({
						owner,
						effect: def,
						attacker: diffPlayerSnapshots(beforeAttacker, afterAttacker),
						defender: diffPlayerSnapshots(beforeDefender, afterDefender),
					});
				}
			} finally {
				if (owner === 'defender') ctx.game.currentPlayerIndex = original;
			}
		};

		runList('defender', onDamage.defender);
		runList('attacker', onDamage.attacker);
	}

	ctx.pushEffectLog('attack:perform', {
		evaluation: result.evaluation,
		onDamage: onDamageLogs,
	});
};

export default attackPerform;
