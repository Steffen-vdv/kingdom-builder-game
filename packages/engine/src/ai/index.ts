import { SESSION_AI_ACTION_LOG_KEY } from '@kingdom-builder/protocol';
import type { SessionAiActionLogEntry } from '@kingdom-builder/protocol';
import type { ActionTrace } from '../log';
import { snapshotPlayer } from '../log';
import type { EngineContext } from '../context';
import type { PlayerId } from '../state';
import type { ActionParams, AdvanceResult } from '../index';
import { cloneActionTraces } from '../runtime/player_snapshot';

export const TAX_ACTION_ID = 'tax';

type PerformActionResult = ActionTrace[] | void;

function isActionTraceArray(
	value: PerformActionResult,
): value is ActionTrace[] {
	return Array.isArray(value);
}

export type PerformActionFn = <T extends string>(
	actionId: T,
	engineContext: EngineContext,
	params?: ActionParams<T>,
) => PerformActionResult | Promise<PerformActionResult>;

type AdvanceResultValue = AdvanceResult | void;

export type AdvanceFn = (
	engineContext: EngineContext,
) => AdvanceResultValue | Promise<AdvanceResultValue>;

export interface AIDependencies {
	performAction: PerformActionFn;
	advance: AdvanceFn;
}

export type AIController = (
	engineContext: EngineContext,
	dependencies: AIDependencies,
) => Promise<void> | void;

export class AISystem {
	private controllers = new Map<PlayerId, AIController>();

	constructor(private dependencies: AIDependencies) {}

	register(playerId: PlayerId, controller: AIController) {
		this.controllers.set(playerId, controller);
	}

	has(playerId: PlayerId) {
		return this.controllers.has(playerId);
	}

	async run(
		playerId: PlayerId,
		engineContext: EngineContext,
		overrides?: Partial<AIDependencies>,
	) {
		const controller = this.controllers.get(playerId);
		if (!controller) {
			return false;
		}
		const dependencies = {
			...this.dependencies,
			...(overrides || {}),
		} as AIDependencies;
		await controller(engineContext, dependencies);
		return true;
	}
}

export function createAISystem(dependencies: AIDependencies) {
	return new AISystem(dependencies);
}

export function createTaxCollectorController(playerId: PlayerId): AIController {
	let lastLoggedTurn: number | null = null;
	let turnSequence = 0;
	return async (engineContext, dependencies) => {
		if (engineContext.activePlayer.id !== playerId) {
			return;
		}
		const currentPhaseDefinition =
			engineContext.phases[engineContext.game.phaseIndex];
		if (!currentPhaseDefinition?.action) {
			return;
		}
		const actionPointResourceKey = engineContext.actionCostResource;
		if (!actionPointResourceKey) {
			return;
		}

		const finishActionPhaseAsync = async () => {
			if (engineContext.activePlayer.id !== playerId) {
				return;
			}
			if (!engineContext.phases[engineContext.game.phaseIndex]?.action) {
				return;
			}
			const remaining =
				engineContext.activePlayer.resources[actionPointResourceKey];
			if (typeof remaining === 'number' && remaining > 0) {
				engineContext.activePlayer.resources[actionPointResourceKey] = 0;
			}
			await dependencies.advance(engineContext);
		};

		const definition = engineContext.actions.get(TAX_ACTION_ID);
		if (!definition) {
			await finishActionPhaseAsync();
			return;
		}
		if (
			definition.system &&
			!engineContext.activePlayer.actions.has(TAX_ACTION_ID)
		) {
			await finishActionPhaseAsync();
			return;
		}

		if (
			engineContext.activePlayer.id !== playerId ||
			!engineContext.phases[engineContext.game.phaseIndex]?.action
		) {
			return;
		}

		const remainingBefore =
			engineContext.activePlayer.resources[actionPointResourceKey] ?? 0;
		if (remainingBefore <= 0) {
			await finishActionPhaseAsync();
			return;
		}

		try {
			const beforeSnapshot = snapshotPlayer(
				engineContext.activePlayer,
				engineContext,
			);
			const result = await dependencies.performAction(
				TAX_ACTION_ID,
				engineContext,
			);
			const afterSnapshot = snapshotPlayer(
				engineContext.activePlayer,
				engineContext,
			);
			let traces: ActionTrace[] | null = null;
			if (isActionTraceArray(result) && result.length > 0) {
				const currentTurn = engineContext.game.turn;
				if (lastLoggedTurn !== currentTurn) {
					lastLoggedTurn = currentTurn;
					turnSequence = 0;
				}
				traces = cloneActionTraces(result);
			} else {
				traces = [
					{
						id: TAX_ACTION_ID,
						before: beforeSnapshot,
						after: afterSnapshot,
					},
				];
				const currentTurn = engineContext.game.turn;
				if (lastLoggedTurn !== currentTurn) {
					lastLoggedTurn = currentTurn;
					turnSequence = 0;
				}
			}
			if (traces && traces.length > 0) {
				const entry: SessionAiActionLogEntry = {
					turn: engineContext.game.turn,
					sequence: turnSequence++,
					playerId,
					actionId: TAX_ACTION_ID,
					traces,
				};
				engineContext.pushEffectLog(SESSION_AI_ACTION_LOG_KEY, entry);
			}
		} catch (error) {
			void error;
			await finishActionPhaseAsync();
			return;
		}

		if (
			engineContext.activePlayer.id === playerId &&
			engineContext.phases[engineContext.game.phaseIndex]?.action &&
			(engineContext.activePlayer.resources[actionPointResourceKey] ?? 0) <= 0
		) {
			await finishActionPhaseAsync();
		}
	};
}
