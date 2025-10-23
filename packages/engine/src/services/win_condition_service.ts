import type { EngineContext } from '../context';
import type { PlayerId, PlayerState, ResourceKey } from '../state';
import type {
	WinConditionDefinition,
	WinConditionResult,
	WinConditionTrigger,
} from './win_condition_types';
import type { ResourceV2Service } from './resourceV2_service';

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
	private readonly resourceV2: ResourceV2Service | undefined;

	constructor(
		definitions: WinConditionDefinition[] | undefined,
		resourceV2?: ResourceV2Service,
	) {
		this.definitions = definitions ? [...definitions] : [];
		this.resourceV2 = resourceV2;
	}

	evaluateResourceChange(
		context: EngineContext,
		subject: PlayerState,
		resourceKey: ResourceKey,
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
			if (definition.trigger.key !== resourceKey) {
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

	clone(resourceV2?: ResourceV2Service): WinConditionService {
		return new WinConditionService(
			structuredClone(this.definitions),
			resourceV2,
		);
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
			const value = this.getResourceValue(opponent, trigger.key);
			return compareThreshold(trigger.comparison, value, trigger.value);
		}
		const value = this.getResourceValue(subject, trigger.key);
		return compareThreshold(trigger.comparison, value, trigger.value);
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

	private getResourceValue(player: PlayerState, key: ResourceKey): number {
		if (this.resourceV2?.hasDefinition(key)) {
			return this.resourceV2.getValue(player, key);
		}
		return player.resources[key] ?? 0;
	}
}
