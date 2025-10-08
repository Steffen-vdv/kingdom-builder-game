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

export class Services {
	tieredResource: TieredResourceService;
	popcap: PopCapService;
	winConditions: WinConditionService;
	private activeTiers: Map<PlayerId, HappinessTierDefinition> = new Map();

	constructor(
		public rules: RuleSet,
		developments: Registry<DevelopmentConfig>,
		winConditionConfigs: WinConditionConfig[],
	) {
		this.tieredResource = new TieredResourceService(rules);
		this.popcap = new PopCapService(rules, developments);
		this.winConditions = new WinConditionService(winConditionConfigs);
	}

	handleTieredResourceChange(
		context: Context,
		tierKey: TierResource,
		player?: PlayerState,
	) {
		if (tierKey !== this.tieredResource.resourceKey) {
			return;
		}
		const targetPlayer = player ?? context.activePlayer;
		const originalIndex = context.game.currentPlayerIndex;
		const targetIndex = context.game.players.indexOf(targetPlayer);
		if (targetIndex === -1) {
			return;
		}
		context.game.currentPlayerIndex = targetIndex;
		try {
			const value = targetPlayer.resources[tierKey] ?? 0;
			const nextTier = this.tieredResource.definition(value);
			const currentTier = this.activeTiers.get(targetPlayer.id);
			if (currentTier?.id === nextTier?.id) {
				return;
			}
			if (currentTier) {
				const exitEffects = currentTier.exitEffects ?? [];
				if (exitEffects.length) {
					runEffects(exitEffects, context);
				}
				this.activeTiers.delete(targetPlayer.id);
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
					const passive = context.passives.get(passiveId, targetPlayer.id);
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
				this.activeTiers.set(targetPlayer.id, nextTier);
			} else {
				this.activeTiers.delete(targetPlayer.id);
			}
		} finally {
			context.game.currentPlayerIndex = originalIndex;
		}
	}

	notifyResourceChange(
		context: Context,
		player: PlayerState,
		resourceKey: ResourceKey,
	) {
		this.handleTieredResourceChange(context, resourceKey, player);
		this.winConditions.evaluate(context, player, resourceKey);
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

	clone(developments: Registry<DevelopmentConfig>): Services {
		const cloned = new Services(this.rules, developments, []);
		cloned.activeTiers = new Map(this.activeTiers);
		cloned.winConditions = this.winConditions.clone();
		return cloned;
	}
}
