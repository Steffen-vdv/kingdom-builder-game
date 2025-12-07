import type { EffectDef } from '../effects';

export type ResourceAttackTarget = {
	type: 'resource';
	key: string;
};

export type BuildingAttackTarget = {
	type: 'building';
	id: string;
};

export type AttackTarget = ResourceAttackTarget | BuildingAttackTarget;

export interface AttackCalcOptions {
	ignoreAbsorption?: boolean;
	ignoreFortification?: boolean;
}

export type AttackLogOwner = 'attacker' | 'defender';

export interface AttackPowerLog {
	base: number;
	modified: number;
}

export interface AttackNumericTargetLog {
	before: number;
	damage: number;
	after: number;
}

export type ResourceAttackEvaluationTargetLog = ResourceAttackTarget &
	AttackNumericTargetLog;

export interface BuildingAttackEvaluationTargetLog {
	type: 'building';
	id: string;
	existed: boolean;
	destroyed: boolean;
	damage: number;
}

export type AttackEvaluationTargetLog =
	| ResourceAttackEvaluationTargetLog
	| BuildingAttackEvaluationTargetLog;

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

/**
 * Represents a change in a player's ResourceV2 value during an attack.
 * The key is the ResourceV2 identifier (e.g., 'resource:core:gold').
 */
export interface AttackPlayerDiff {
	key: string;
	before: number;
	after: number;
}

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
