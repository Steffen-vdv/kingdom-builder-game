import type { EffectDef } from '../effects';

export type ResourceAttackTarget = {
	type: 'resource';
	key: string;
};

export type StatAttackTarget = {
	type: 'stat';
	key: string;
};

export type BuildingAttackTarget = {
	type: 'building';
	id: string;
};

export type AttackTarget =
	| ResourceAttackTarget
	| StatAttackTarget
	| BuildingAttackTarget;

export interface AttackCalcOptions {
	ignoreAbsorption?: boolean;
	ignoreFortification?: boolean;
	absorptionResourceId?: string;
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

export type StatAttackEvaluationTargetLog = StatAttackTarget &
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
	| StatAttackEvaluationTargetLog
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

export interface AttackResourceDiff {
	type: 'resource';
	key: string;
	before: number;
	after: number;
}

export interface AttackStatDiff {
	type: 'stat';
	key: string;
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
