import type { EngineContext } from '../context';
import type { PlayerState, ResourceV2Key } from '../state';
export type ResourceV2ChangeReason = 'value' | 'lowerBound' | 'upperBound';

export interface ResourceV2Change {
	reason: ResourceV2ChangeReason;
	previousValue: number;
	newValue: number;
	delta: number;
	suppressHooks: boolean;
	previousBound?: number;
	newBound?: number;
}

export interface ResourceV2ChangeHandler {
	(
		context: EngineContext,
		player: PlayerState,
		resourceId: ResourceV2Key,
		change: ResourceV2Change,
	): void;
}

export type HookPayload = {
	player: PlayerState;
	resourceId: ResourceV2Key;
	amount: number;
};

export type ResourceV2Hook = (
	context: EngineContext,
	payload: HookPayload,
) => void;
