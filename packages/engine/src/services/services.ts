import type { ResourceKey, PlayerId } from '../state';
import type { EngineContext } from '../context';
import type { DevelopmentConfig } from '../config/schema';
import type { Registry } from '../registry';
import { runEffects } from '../effects';
import { TieredResourceService } from './tiered_resource_service';
import { PopCapService } from './pop_cap_service';
import type { HappinessTierDefinition } from './tiered_resource_types';
import type { RuleSet } from './services_types';

type Context = EngineContext;
type TierResource = ResourceKey;

export class Services {
	tieredResource: TieredResourceService;
	popcap: PopCapService;
	private activeTiers: Map<PlayerId, HappinessTierDefinition> = new Map();

	constructor(
		public rules: RuleSet,
		developments: Registry<DevelopmentConfig>,
	) {
		this.tieredResource = new TieredResourceService(rules);
		this.popcap = new PopCapService(rules, developments);
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
			if (currentTier.exitEffects?.length) {
				runEffects(currentTier.exitEffects, context);
			}
			this.activeTiers.delete(player.id);
		}
		if (nextTier) {
			if (nextTier.enterEffects?.length) {
				runEffects(nextTier.enterEffects, context);
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

	clone(developments: Registry<DevelopmentConfig>): Services {
		const cloned = new Services(this.rules, developments);
		cloned.activeTiers = new Map(this.activeTiers);
		return cloned;
	}
}
