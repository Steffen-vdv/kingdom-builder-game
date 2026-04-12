import type { EngineContext } from '../context';
import type { PlayerId, PlayerState } from '../state';
import type {
	WinConditionDefinition,
	WinConditionResult,
} from './win_condition_types';
import type { WinConditionResourceTrigger } from '@kingdom-builder/protocol';

function compareThreshold(
	comparison: WinConditionResourceTrigger['comparison'],
	actual: number,
	expected: number,
): boolean {
	if (comparison === 'lt') {
		return actual < expected;
	}
	if (comparison === 'lte') {
		return actual <= expected;
	}
	if (comparison === 'gt') {
		return actual > expected;
	}
	return actual >= expected;
}

function resolveWinner(
	result: WinConditionResult,
	subjectId: PlayerId,
	opponentId: PlayerId,
): PlayerId | undefined {
	if (result.subject === 'victory') {
		return subjectId;
	}
	if (result.opponent === 'victory') {
		return opponentId;
	}
	return undefined;
}

export class WinConditionService {
	private readonly definitions: WinConditionDefinition[];

	constructor(definitions: WinConditionDefinition[] | undefined) {
		this.definitions = definitions ? [...definitions] : [];
	}

	evaluateResourceChange(
		context: EngineContext,
		subject: PlayerState,
		resourceIdentifier: string,
	): void {
		if (context.game.conclusion) {
			return;
		}
		if (this.definitions.length === 0) {
			return;
		}
		for (const definition of this.definitions) {
			if (definition.trigger.type !== 'resource') {
				continue;
			}
			const trigger = definition.trigger;
			if (!this.triggerMatchesResource(trigger, subject, resourceIdentifier)) {
				continue;
			}
			if (!this.matchesTrigger(trigger, context, subject)) {
				continue;
			}
			this.applyResult(definition, context, subject);
			if (context.game.conclusion) {
				break;
			}
		}
	}

	/**
	 * Evaluates turn-limit win conditions after a turn
	 * increment. If any turn-limit trigger fires, the
	 * player with the higher score wins.
	 */
	evaluateTurnAdvance(context: EngineContext): void {
		if (context.game.conclusion) {
			return;
		}
		for (const definition of this.definitions) {
			if (definition.trigger.type !== 'turn-limit') {
				continue;
			}
			const trigger = definition.trigger;
			if (context.game.turn <= trigger.maxTurns) {
				continue;
			}
			const [playerA, playerB] = context.game.players;
			if (!playerA || !playerB) {
				continue;
			}
			const scoreA = playerA.resourceValues[trigger.scoreResourceId] ?? 0;
			const scoreB = playerB.resourceValues[trigger.scoreResourceId] ?? 0;
			const winnerId = scoreA >= scoreB ? playerA.id : playerB.id;
			const loserId = winnerId === playerA.id ? playerB.id : playerA.id;
			context.game.conclusion = {
				conditionId: definition.id,
				winnerId,
				loserId,
				triggeredBy: winnerId,
			};
			break;
		}
	}

	clone(): WinConditionService {
		return new WinConditionService(structuredClone(this.definitions));
	}

	private matchesTrigger(
		trigger: WinConditionResourceTrigger,
		context: EngineContext,
		subject: PlayerState,
	): boolean {
		const opponent = this.getOpponent(context, subject);
		if (trigger.target === 'opponent') {
			if (!opponent) {
				return false;
			}
			const value = this.getTriggerResourceValue(trigger, opponent);
			return compareThreshold(trigger.comparison, value, trigger.value);
		}
		const value = this.getTriggerResourceValue(trigger, subject);
		return compareThreshold(trigger.comparison, value, trigger.value);
	}

	private triggerMatchesResource(
		trigger: WinConditionResourceTrigger,
		subject: PlayerState,
		identifier: string,
	): boolean {
		const resolvedId = this.resolveTriggerResourceId(trigger, subject);
		if (identifier === resolvedId) {
			return true;
		}
		return identifier === trigger.resourceId;
	}

	private resolveTriggerResourceId(
		trigger: WinConditionResourceTrigger,
		_player: PlayerState,
	): string {
		return trigger.resourceId;
	}

	private getTriggerResourceValue(
		trigger: WinConditionResourceTrigger,
		player: PlayerState,
	): number {
		const resourceId = this.resolveTriggerResourceId(trigger, player);
		const value = player.resourceValues[resourceId];
		if (typeof value === 'number') {
			return value;
		}
		return 0;
	}

	private applyResult(
		definition: WinConditionDefinition,
		context: EngineContext,
		subject: PlayerState,
	): void {
		const opponent = this.getOpponent(context, subject);
		if (!opponent) {
			return;
		}
		const winnerId = resolveWinner(definition.result, subject.id, opponent.id);
		if (!winnerId) {
			return;
		}
		const loserId = winnerId === subject.id ? opponent.id : subject.id;
		context.game.conclusion = {
			conditionId: definition.id,
			winnerId,
			loserId,
			triggeredBy: subject.id,
		};
	}

	private getOpponent(
		context: EngineContext,
		subject: PlayerState,
	): PlayerState | undefined {
		return context.game.players.find((player) => player.id !== subject.id);
	}
}
