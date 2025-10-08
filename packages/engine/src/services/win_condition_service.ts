import type { EngineContext } from '../context';
import type { PlayerId, PlayerState } from '../state';
import type { WinConditionConfig } from '@kingdom-builder/protocol';

function cloneDisplay(
	display: NonNullable<WinConditionConfig['display']>,
): NonNullable<WinConditionConfig['display']> {
	const cloned = {
		winner: { ...display.winner },
		loser: { ...display.loser },
	} as NonNullable<WinConditionConfig['display']>;
	if (display.icon !== undefined) {
		cloned.icon = display.icon;
	}
	return cloned;
}

function cloneDefinition(definition: WinConditionConfig): WinConditionConfig {
	const cloned: WinConditionConfig = {
		id: definition.id,
		rule: {
			type: definition.rule.type,
			method: definition.rule.method,
		},
	};
	if (definition.rule.params) {
		cloned.rule.params = { ...definition.rule.params };
	}
	if (definition.rule.awardsTo) {
		cloned.rule.awardsTo = definition.rule.awardsTo;
	}
	if (definition.priority !== undefined) {
		cloned.priority = definition.priority;
	}
	if (definition.display) {
		cloned.display = cloneDisplay(definition.display);
	}
	return cloned;
}

function keyForRule(rule: WinConditionConfig['rule']): string {
	return `${rule.type}:${rule.method}`;
}

type WinConditionHandler = (
	context: EngineContext,
	player: PlayerState,
	definition: WinConditionConfig,
) => void;

function compare(
	amount: number,
	threshold: number,
	comparison: string,
): boolean {
	switch (comparison) {
		case 'lt':
			return amount < threshold;
		case 'lte':
			return amount <= threshold;
		case 'gt':
			return amount > threshold;
		case 'gte':
			return amount >= threshold;
		default:
			return false;
	}
}

function normalizeAward(
	award: WinConditionConfig['rule']['awardsTo'] | undefined,
): 'self' | 'opponents' | 'none' {
	if (award === 'self' || award === 'none') {
		return award;
	}
	return 'opponents';
}

export class WinConditionService {
	private readonly definitions: WinConditionConfig[];
	private readonly handlers: Map<string, WinConditionHandler> = new Map();

	constructor(definitions: WinConditionConfig[]) {
		this.definitions = definitions
			.map((definition) => cloneDefinition(definition))
			.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
		this.registerDefaults();
	}

	private registerDefaults() {
		this.register('resource', 'threshold', this.evaluateResourceThreshold);
	}

	private register(type: string, method: string, handler: WinConditionHandler) {
		this.handlers.set(`${type}:${method}`, handler);
	}

	evaluate(context: EngineContext, player?: PlayerState) {
		if (context.game.outcome) {
			return;
		}
		const targets = player ? [player] : context.game.players;
		for (const definition of this.definitions) {
			const handler = this.handlers.get(keyForRule(definition.rule));
			if (!handler) {
				continue;
			}
			for (const target of targets) {
				if (context.game.outcome) {
					return;
				}
				handler(context, target, definition);
				if (context.game.outcome) {
					return;
				}
			}
		}
	}

	getDefinitions(): WinConditionConfig[] {
		return this.definitions.map((definition) => cloneDefinition(definition));
	}

	private evaluateResourceThreshold: WinConditionHandler = (
		context,
		player,
		definition,
	) => {
		const params = definition.rule.params || {};
		const key = params['resource'];
		if (typeof key !== 'string') {
			return;
		}
		const resourceRecord: Record<string, number> = player.resources;
		const amount = resourceRecord[key] ?? 0;
		const rawValue = params['value'];
		const threshold =
			typeof rawValue === 'number' ? rawValue : Number(rawValue);
		if (!Number.isFinite(threshold)) {
			return;
		}
		const comparison = (params['comparison'] as string | undefined) ?? 'lte';
		if (!compare(amount, threshold, comparison)) {
			return;
		}
		const award = normalizeAward(definition.rule.awardsTo);
		this.setOutcome(context, player, definition, award);
	};

	private setOutcome(
		context: EngineContext,
		player: PlayerState,
		definition: WinConditionConfig,
		award: 'self' | 'opponents' | 'none',
	) {
		if (context.game.outcome) {
			return;
		}
		const winners: PlayerId[] = [];
		const losers: PlayerId[] = [];
		const others = context.game.players
			.filter((candidate) => candidate.id !== player.id)
			.map((candidate) => candidate.id);
		if (award === 'self') {
			winners.push(player.id);
			losers.push(...others);
		} else if (award === 'opponents') {
			winners.push(...others);
			losers.push(player.id);
		} else {
			losers.push(player.id);
		}
		const winnerSet = new Set(winners);
		const loserSet = new Set(losers);
		if (winnerSet.size === 0 && loserSet.size === 0) {
			return;
		}
		context.game.outcome = {
			conditionId: definition.id,
			winners: Array.from(winnerSet),
			losers: Array.from(loserSet),
		};
	}
}
