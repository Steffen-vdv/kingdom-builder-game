import type { EngineContext } from '../context';
import type { PlayerState } from '../state';

export interface WriteResourceValueOptions {
	readonly context?: EngineContext;
	readonly suppressLog?: boolean;
}

export interface ClampResult {
	readonly finalValue: number;
	readonly clampedToLowerBound: boolean;
	readonly clampedToUpperBound: boolean;
}

export interface WriteResourceValueResult extends ClampResult {
	readonly previousValue: number;
	readonly nextValue: number;
	readonly delta: number;
}

export interface AdjustResourceBoundsOptions {
	readonly context?: EngineContext;
	readonly suppressLog?: boolean;
	readonly nextLowerBound?: number | null;
	readonly nextUpperBound?: number | null;
}

export interface AdjustResourceBoundsResult extends ClampResult {
	readonly previousLowerBound: number | null;
	readonly nextLowerBound: number | null;
	readonly previousUpperBound: number | null;
	readonly nextUpperBound: number | null;
	readonly lowerBoundChanged: boolean;
	readonly upperBoundChanged: boolean;
	readonly previousValue: number;
	readonly nextValue: number;
	readonly delta: number;
}

export interface ResourceStateHelpers {
	initialisePlayerState(player: PlayerState): void;
	readValue(player: PlayerState, resourceId: string): number;
	writeValue(
		player: PlayerState,
		resourceId: string,
		nextValue: number,
		options?: WriteResourceValueOptions,
	): WriteResourceValueResult;
	adjustBounds(
		player: PlayerState,
		resourceId: string,
		options: AdjustResourceBoundsOptions,
	): AdjustResourceBoundsResult;
}
