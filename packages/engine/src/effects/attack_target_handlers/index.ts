import type {
	AttackEvaluationTargetLog,
	AttackTarget,
} from '@kingdom-builder/protocol';
import type { EngineContext } from '../../context';
import type { PlayerState } from '../../state';

import buildingHandler from './building';
import resourceHandler from './resource';

export interface AttackTargetHandlerMeta {
	defenderIndex: number;
	originalIndex: number;
}

export type AttackTargetType = AttackTarget['type'];

type AttackTargetForType<T extends AttackTargetType> = Extract<
	AttackTarget,
	{ type: T }
>;

export type AttackTargetMutationResult<T extends AttackTargetType> =
	T extends 'resource'
		? { before: number; after: number }
		: T extends 'building'
			? { existed: boolean; destroyed: boolean }
			: never;

export interface AttackTargetHandler<
	T extends AttackTarget,
	Mutation = unknown,
> {
	getEvaluationModifierKey(target: T): string;
	applyDamage(
		target: T,
		damage: number,
		engineContext: EngineContext,
		defender: PlayerState,
		meta: AttackTargetHandlerMeta,
	): Mutation;
	buildLog(
		target: T,
		damage: number,
		engineContext: EngineContext,
		defender: PlayerState,
		meta: AttackTargetHandlerMeta,
		mutation: Mutation,
	): AttackEvaluationTargetLog;
}

export type AttackTargetHandlerMap = {
	[Type in AttackTargetType]: AttackTargetHandler<
		AttackTargetForType<Type>,
		AttackTargetMutationResult<Type>
	>;
};

export const attackTargetHandlers: AttackTargetHandlerMap = {
	resource: resourceHandler,
	building: buildingHandler,
};
