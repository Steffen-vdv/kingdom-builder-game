import {
	createEngine,
	type EngineCreationOptions,
} from '../setup/create_engine';
import type { EngineContext } from '../context';
import { performAction as runAction } from '../actions/action_execution';
import { advance as runAdvance } from '../phases/advance';
import { getActionEffectGroups } from '../actions/effect_groups';
import type { ActionParameters } from '../actions/action_parameters';
import type { ActionTrace } from '../log';
import { cloneActionOptions } from './action_options';
import { cloneActionTraces } from './player_snapshot';
import { snapshotAdvance, snapshotEngine } from './engine_snapshot';
import type { EngineAdvanceResult, EngineSessionSnapshot } from './types';

export interface EngineSession {
	performAction<T extends string>(
		actionId: T,
		params?: ActionParameters<T>,
	): ActionTrace[];
	advancePhase(): EngineAdvanceResult;
	getSnapshot(): EngineSessionSnapshot;
	getActionOptions(actionId: string): ReturnType<typeof cloneActionOptions>;
	enqueue<T>(taskFactory: () => Promise<T> | T): Promise<T>;
	setDevMode(enabled: boolean): void;
	/**
	 * @deprecated Temporary escape hatch while the web layer migrates to
	 * snapshots. Avoid new usage and prefer the session facade instead.
	 */
	getLegacyContext(): EngineContext;
}

export type {
	EngineAdvanceResult,
	EngineSessionSnapshot,
	AdvanceSkipSnapshot,
	AdvanceSkipSourceSnapshot,
	GameSnapshot,
	PlayerStateSnapshot,
	LandSnapshot,
} from './types';

export function createEngineSession(
	options: EngineCreationOptions,
): EngineSession {
	const context = createEngine(options);
	return {
		performAction(actionId, params) {
			const traces = runAction(actionId, context, params);
			return cloneActionTraces(traces);
		},
		advancePhase() {
			const result = runAdvance(context);
			return snapshotAdvance(context, result);
		},
		getSnapshot() {
			return snapshotEngine(context);
		},
		getActionOptions(actionId) {
			const groups = getActionEffectGroups(actionId, context);
			return cloneActionOptions(groups);
		},
		enqueue(taskFactory) {
			return context.enqueue(taskFactory);
		},
		setDevMode(enabled) {
			context.game.devMode = enabled;
		},
		getLegacyContext() {
			return context;
		},
	};
}
