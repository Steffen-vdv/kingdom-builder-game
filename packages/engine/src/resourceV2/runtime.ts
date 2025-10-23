import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../context';
import type { ResourceV2State } from './state';

export interface ResourceV2RuntimeHooks {
	onValueChange?(
		context: EngineContext,
		resourceId: string,
		delta: number,
	): void;
	onGain?(context: EngineContext, resourceId: string, amount: number): void;
	onLoss?(context: EngineContext, resourceId: string, amount: number): void;
	onUpperBoundIncrease?(
		context: EngineContext,
		resourceId: string,
		amount: number,
		nextBound: number | undefined,
	): void;
}

export interface ResourceV2TieringRuntime {
	resolveEffects?(id: string): readonly EffectDef[] | undefined;
}

export interface ResourceV2Runtime {
	state: ResourceV2State;
	hooks?: ResourceV2RuntimeHooks;
	tiering?: ResourceV2TieringRuntime;
}

interface ResourceV2ContextCarrier {
	resourceV2?: ResourceV2Runtime;
}

export function getResourceV2Runtime(
	context: EngineContext,
): ResourceV2Runtime {
	const carrier = context as EngineContext & ResourceV2ContextCarrier;
	if (!carrier.resourceV2) {
		throw new Error('ResourceV2 state not initialised on the engine context.');
	}
	return carrier.resourceV2;
}
