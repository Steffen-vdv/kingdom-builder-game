import type { ResourceKey, StatKey } from '../state';

export type ResourceAttackTarget = { type: 'resource'; key: ResourceKey };
export type StatAttackTarget = { type: 'stat'; key: StatKey };
export type BuildingAttackTarget = { type: 'building'; id: string };

export type AttackTarget =
	| ResourceAttackTarget
	| StatAttackTarget
	| BuildingAttackTarget;

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
