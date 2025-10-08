import type { ResourceKey, PlayerId, PlayerState } from '../state';
import type { EngineContext } from '../context';
import type {
	DevelopmentConfig,
	Registry,
	WinConditionConfig,
} from '@kingdom-builder/protocol';
import { runEffects } from '../effects';
import { TieredResourceService } from './tiered_resource_service';
import { PopCapService } from './pop_cap_service';
import type { HappinessTierDefinition } from './tiered_resource_types';
import type { RuleSet } from './services_types';
import { WinConditionService } from './win_condition_service';

type Context = EngineContext;
type TierResource = ResourceKey;

function isResourceKey(key: string, player: PlayerState): key is ResourceKey {
	return Object.prototype.hasOwnProperty.call(player.resources, key);
}

export class Services {
	tieredResource: TieredResourceService;
	popcap: PopCapService;
	win: WinConditionService;
	private activeTiers: Map<PlayerId, HappinessTierDefinition> = new Map();

	constructor(
		public rules: RuleSet,
		developments: Registry<DevelopmentConfig>,
		winConditions: WinConditionConfig[],
	) {
		this.tieredResource = new TieredResourceService(rules);
		this.popcap = new PopCapService(rules, developments);
		this.win = new WinConditionService(winConditions);
	}

	handleTieredResourceChange(context: Context, tierKey: TierResource) {
		if (tierKey !== this.tieredResource.resourceKey) {
			return;
		}
		const player = context.activePlayer;
		const value = player.resources[tierKey] ?? 0;
		const nextTier = this.tieredResource.definition(value);
		const currentTier = this.activeTiers.get(player.id);
		if (currentTier?.id === nextTier?.id) {
			return;
		}
		if (currentTier) {
			const exitEffects = currentTier.exitEffects ?? [];
			if (exitEffects.length) {
				runEffects(exitEffects, context);
			}
			this.activeTiers.delete(player.id);
		}
		if (nextTier) {
			const enterEffects = nextTier.enterEffects ?? [];
			if (enterEffects.length) {
				runEffects(enterEffects, context);
			}
			const passiveId = nextTier.preview?.id;
			const summaryToken =
				nextTier.display?.summaryToken ?? nextTier.text?.summary;
			if (passiveId && summaryToken) {
				const passive = context.passives.get(passiveId, player.id);
				if (passive) {
					passive.detail = summaryToken;
					const existingMeta = passive.meta ?? {};
					const baseSource = existingMeta.source ?? {
						type: 'tiered-resource',
						id: nextTier.id,
					};
					passive.meta = {
						...existingMeta,
						source: {
							...baseSource,
							labelToken: summaryToken,
						},
					};
				}
			}
			this.activeTiers.set(player.id, nextTier);
		} else {
			this.activeTiers.delete(player.id);
		}
	}

	initializeTierPassives(context: EngineContext) {
		const resourceKey = this.tieredResource.resourceKey;
		const previousIndex = context.game.currentPlayerIndex;
		context.game.players.forEach((_player, index) => {
			context.game.currentPlayerIndex = index;
			this.handleTieredResourceChange(context, resourceKey);
		});
		context.game.currentPlayerIndex = previousIndex;
	}

	handleResourceChange(context: Context, player: PlayerState, key: string) {
		if (context.game.outcome) {
			return;
		}
		if (!isResourceKey(key, player)) {
			return;
		}
		const originalIndex = context.game.currentPlayerIndex;
		const playerIndex = context.game.players.indexOf(player);
		if (playerIndex >= 0) {
			context.game.currentPlayerIndex = playerIndex;
		}
		try {
			this.handleTieredResourceChange(context, key);
			this.win.evaluate(context, player);
		} finally {
			context.game.currentPlayerIndex = originalIndex;
		}
	}

	clone(developments: Registry<DevelopmentConfig>): Services {
		const cloned = new Services(
			this.rules,
			developments,
			this.win.getDefinitions(),
		);
		cloned.activeTiers = new Map(this.activeTiers);
		return cloned;
	}
}
