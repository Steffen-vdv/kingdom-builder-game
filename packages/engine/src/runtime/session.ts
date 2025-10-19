import {
	createEngine,
	type EngineCreationOptions,
} from '../setup/create_engine';
import { performAction as runAction } from '../actions/action_execution';
import { advance as runAdvance } from '../phases/advance';
import { getActionEffectGroups } from '../actions/effect_groups';
import {
	getActionCosts as resolveActionCosts,
	getActionRequirements as resolveActionRequirements,
} from '../actions/costs';
import type { ActionParameters } from '../actions/action_parameters';
import type { ActionTrace } from '../log';
import { cloneActionOptions } from './action_options';
import { cloneActionTraces } from './player_snapshot';
import { snapshotAdvance, snapshotEngine } from './engine_snapshot';
import type {
	SessionActionDefinitionSummary,
	SessionAdvanceResult,
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import type { EvaluationModifier } from '../services/passive_types';
import {
	simulateUpcomingPhases as runSimulation,
	type SimulateUpcomingPhasesOptions,
	type SimulateUpcomingPhasesResult,
} from './simulate_upcoming_phases';
import type { PlayerId } from '../state';
import type { AIDependencies } from '../ai';
import type { WinConditionDefinition } from '../services/win_condition_types';
import {
	applyDeveloperPreset as applyDeveloperPresetInternal,
	type DeveloperPresetOptions,
} from './developer_preset';

type ActionDefinitionSummary = SessionActionDefinitionSummary;

function cloneEffectLogEntry<T>(entry: T): T {
	if (typeof entry !== 'object' || entry === null) {
		return entry;
	}
	return structuredClone(entry);
}

function clonePassiveEvaluationMods(
	source: ReadonlyMap<string, Map<string, EvaluationModifier>>,
): Map<string, Map<string, EvaluationModifier>> {
	const entries: Array<[string, Map<string, EvaluationModifier>]> = [];
	for (const [target, modifiers] of source.entries()) {
		entries.push([target, new Map(modifiers)]);
	}
	return new Map(entries);
}

function cloneWinConditions(
	definitions: WinConditionDefinition[],
): WinConditionDefinition[] {
	return structuredClone(definitions);
}

export interface EngineSession {
	performAction<T extends string>(
		actionId: T,
		params?: ActionParameters<T>,
	): ActionTrace[];
	advancePhase(): SessionAdvanceResult;
	getSnapshot(): SessionSnapshot;
	getActionOptions(actionId: string): ReturnType<typeof cloneActionOptions>;
	getActionCosts<T extends string>(
		actionId: T,
		params?: ActionParameters<T>,
	): ReturnType<typeof resolveActionCosts>;
	getActionRequirements<T extends string>(
		actionId: T,
		params?: ActionParameters<T>,
	): ReturnType<typeof resolveActionRequirements>;
	getActionDefinition(actionId: string): ActionDefinitionSummary | undefined;
	pullEffectLog<T>(key: string): T | undefined;
	getPassiveEvaluationMods(): Map<string, Map<string, EvaluationModifier>>;
	enqueue<T>(taskFactory: () => Promise<T> | T): Promise<T>;
	setDevMode(enabled: boolean): void;
	runAiTurn(
		playerId: PlayerId,
		overrides?: Partial<AIDependencies>,
	): Promise<boolean>;
	hasAiController(playerId: PlayerId): boolean;
	simulateUpcomingPhases(
		playerId: PlayerId,
		options?: SimulateUpcomingPhasesOptions,
	): SimulateUpcomingPhasesResult;
	getRuleSnapshot(): SessionRuleSnapshot;
	pushEffectLog<T>(key: string, entry: T): void;
	applyDeveloperPreset(options: DeveloperPresetOptions): void;
	updatePlayerName(playerId: PlayerId, name: string): void;
}

export type {
	EngineAdvanceResult,
	EngineSessionSnapshot,
	AdvanceSkipSnapshot,
	AdvanceSkipSourceSnapshot,
	GameSnapshot,
	GameConclusionSnapshot,
	PlayerStateSnapshot,
	LandSnapshot,
	RuleSnapshot,
	PassiveRecordSnapshot,
	ActionDefinitionSummary,
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
		getActionCosts(actionId, params) {
			const costs = resolveActionCosts(actionId, context, params);
			return { ...costs };
		},
		getActionRequirements(actionId, params) {
			const requirements = resolveActionRequirements(actionId, context, params);
			return [...requirements];
		},
		getActionDefinition(actionId) {
			const definition = context.actions.get(actionId);
			if (!definition) {
				return undefined;
			}
			const summary: ActionDefinitionSummary = {
				id: definition.id,
				name: definition.name,
			};
			if (definition.system !== undefined) {
				summary.system = definition.system;
			}
			return summary;
		},
		pullEffectLog<T>(key: string) {
			const entry = context.pullEffectLog<T>(key);
			if (entry === undefined) {
				return undefined;
			}
			return cloneEffectLogEntry(entry);
		},
		getPassiveEvaluationMods() {
			return clonePassiveEvaluationMods(context.passives.evaluationMods);
		},
		enqueue(taskFactory) {
			return context.enqueue(taskFactory);
		},
		setDevMode(enabled) {
			context.game.devMode = enabled;
		},
		async runAiTurn(playerId, overrides) {
			if (!context.aiSystem) {
				return false;
			}
			return context.aiSystem.run(playerId, context, overrides);
		},
		hasAiController(playerId) {
			if (!context.aiSystem) {
				return false;
			}
			return context.aiSystem.has(playerId);
		},
		simulateUpcomingPhases(playerId, options) {
			const result = runSimulation(context, playerId, options);
			return structuredClone(result);
		},
		getRuleSnapshot() {
			const {
				tieredResourceKey,
				tierDefinitions,
				winConditions = [],
				defaultActionAPCost,
			} = context.services.rules;
			const clonedDefinitions = structuredClone(tierDefinitions);
			const clonedWinConditions = cloneWinConditions(winConditions);
			return {
				tieredResourceKey,
				tierDefinitions: clonedDefinitions,
				winConditions: clonedWinConditions,
				defaultActionAPCost,
			} satisfies SessionRuleSnapshot;
		},
		pushEffectLog(key, entry) {
			context.pushEffectLog(key, cloneEffectLogEntry(entry));
		},
		applyDeveloperPreset(options) {
			applyDeveloperPresetInternal(context, options);
		},
		updatePlayerName(playerId, name) {
			const player = context.game.players.find(
				(entry) => entry.id === playerId,
			);
			if (player) {
				player.name = name;
			}
		},
	};
}

export { cloneEffectLogEntry, clonePassiveEvaluationMods };
export type EngineSessionGetActionCosts = EngineSession['getActionCosts'];
export type EngineSessionGetActionRequirements =
	EngineSession['getActionRequirements'];
export type { DeveloperPresetOptions } from './developer_preset';
