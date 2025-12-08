import type { EngineContext } from '../context';
import type { PlayerId, PlayerState } from '../state';
import type {
	WinConditionDefinition,
	WinConditionResult,
	WinConditionTrigger,
} from './win_condition_types';

function compareThreshold(
	comparison: WinConditionTrigger['comparison'],
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
			if (
				!this.triggerMatchesResource(
					definition.trigger,
					subject,
					resourceIdentifier,
				)
			) {
				continue;
			}
			if (!this.matchesTrigger(definition.trigger, context, subject)) {
				continue;
			}
			this.applyResult(definition, context, subject);
			if (context.game.conclusion) {
				break;
			}
		}
	}

	clone(): WinConditionService {
		return new WinConditionService(structuredClone(this.definitions));
	}

	private matchesTrigger(
		trigger: WinConditionTrigger,
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
		trigger: WinConditionTrigger,
		subject: PlayerState,
		identifier: string,
	): boolean {
		if (trigger.type !== 'resource') {
			return false;
		}
		const resolvedId = this.resolveTriggerResourceId(trigger, subject);
		if (identifier === resolvedId) {
			return true;
		}
		return identifier === trigger.resourceId;
	}

	private resolveTriggerResourceId(
		trigger: WinConditionTrigger,
		_player: PlayerState,
	): string {
		const resourceTrigger = trigger as WinConditionTrigger & {
			resourceId?: string;
		};
		if (resourceTrigger.resourceId && resourceTrigger.resourceId.length > 0) {
			return resourceTrigger.resourceId;
		}
		// key IS the Resource ID directly (no mapper needed)
		return resourceTrigger.resourceId;
	}

	private getTriggerResourceValue(
		trigger: WinConditionTrigger,
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
