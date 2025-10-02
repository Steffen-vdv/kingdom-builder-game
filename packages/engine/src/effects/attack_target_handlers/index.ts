import type { EngineContext } from '../../context';
import type { PlayerState } from '../../state';
import type {
	AttackEvaluationTargetLog,
	AttackTarget,
	BuildingAttackTarget,
	ResourceAttackTarget,
	StatAttackTarget,
} from '../attack.types';

import buildingHandler from './building';
import resourceHandler from './resource';
import statHandler from './stat';

export interface AttackTargetHandlerMeta {
	defenderIndex: number;
	originalIndex: number;
}

export interface AttackTargetHandler<
	T extends AttackTarget,
	Mutation = unknown,
> {
	applyDamage(
		target: T,
		damage: number,
		ctx: EngineContext,
		defender: PlayerState,
		meta: AttackTargetHandlerMeta,
	): Mutation;
	buildLog(
		target: T,
		damage: number,
		ctx: EngineContext,
		defender: PlayerState,
		meta: AttackTargetHandlerMeta,
		mutation: Mutation,
	): AttackEvaluationTargetLog;
}

export type AttackTargetHandlerMap = {
	resource: AttackTargetHandler<
		ResourceAttackTarget,
		{ before: number; after: number }
	>;
	stat: AttackTargetHandler<
		StatAttackTarget,
		{ before: number; after: number }
	>;
	building: AttackTargetHandler<
		BuildingAttackTarget,
		{ existed: boolean; destroyed: boolean }
	>;
};

export const attackTargetHandlers: AttackTargetHandlerMap = {
	resource: resourceHandler,
	stat: statHandler,
	building: buildingHandler,
};
