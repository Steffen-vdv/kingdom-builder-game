import type { EngineContext } from '../context';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { GameOutcome, PlayerId, PlayerState, ResourceKey } from '../state';
import type {
	ResourceThresholdWinConditionConfig,
	WinConditionConfig,
} from '@kingdom-builder/protocol';

const comparisonOperators: Record<
	ResourceThresholdWinConditionConfig['comparison'],
	(value: number, target: number) => boolean
> = {
	lt: (value, target) => value < target,
	lte: (value, target) => value <= target,
	gt: (value, target) => value > target,
	gte: (value, target) => value >= target,
	eq: (value, target) => value === target,
};

function isResourceThreshold(
	config: WinConditionConfig,
): config is ResourceThresholdWinConditionConfig {
	return config.type === 'resource-threshold';
}

export class WinConditionService {
	private readonly definitions: ResourceThresholdWinConditionConfig[];
	private readonly byResource: Map<
		string,
		ResourceThresholdWinConditionConfig[]
	> = new Map();

	constructor(configs: WinConditionConfig[]) {
		this.definitions = configs
			.filter(isResourceThreshold)
			.map((definition) => ({ ...definition }));
		for (const definition of this.definitions) {
			const key = definition.resource;
			const list = this.byResource.get(key) ?? [];
			list.push({ ...definition });
			this.byResource.set(key, list);
		}
	}

	evaluate(
		context: EngineContext,
		player: PlayerState,
		resourceKey: ResourceKey,
	): void {
		if (context.game.outcome.status === 'finished') {
			return;
		}
		const definitions = this.byResource.get(resourceKey);
		if (!definitions || definitions.length === 0) {
			return;
		}
		const currentValue = player.resources[resourceKey] ?? 0;
		for (const definition of definitions) {
			const comparator = comparisonOperators[definition.comparison];
			if (!comparator(currentValue, definition.value)) {
				continue;
			}
			this.resolve(context, player.id, definition);
			return;
		}
	}

	private resolve(
		context: EngineContext,
		triggeringPlayerId: PlayerId,
		definition: ResourceThresholdWinConditionConfig,
	) {
		if (context.game.outcome.status === 'finished') {
			return;
		}
		let fallbackOpponent: PlayerId = triggeringPlayerId;
		for (const player of context.game.players) {
			if (player.id === triggeringPlayerId) {
				continue;
			}
			fallbackOpponent = player.id;
			break;
		}
		const winnerId =
			definition.result === 'win' ? triggeringPlayerId : fallbackOpponent;
		const loserId =
			definition.result === 'win' ? fallbackOpponent : triggeringPlayerId;
		const outcome: Extract<GameOutcome, { status: 'finished' }> = {
			status: 'finished',
			winnerId,
			loserId,
			conditionId: definition.id,
			triggeredPlayerId: triggeringPlayerId,
			triggeredResult: definition.result,
		};
		Object.assign(context.game.outcome, outcome);
	}

	clone(): WinConditionService {
		return new WinConditionService(this.definitions);
	}
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment */
