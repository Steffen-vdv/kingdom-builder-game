import type { EngineContext } from '../context';
import { runEffects } from '../effects';
import type { DevelopmentConfig } from '../config/schema';
import type { Registry } from '../registry';
import type { ResourceKey, PlayerId } from '../state';
import { PopCapService } from './pop_cap_service';
import type { RuleSet } from './services_types';
import { TieredResourceService } from './tiered_resource_service';
import type { HappinessTierDefinition } from './tiered_resource_types';

export class Services {
	readonly tieredResource: TieredResourceService;
	readonly popcap: PopCapService;
	private activeTiers: Map<PlayerId, HappinessTierDefinition> = new Map();

	constructor(
		public readonly rules: RuleSet,
		developments: Registry<DevelopmentConfig>,
	) {
		this.tieredResource = new TieredResourceService(rules);
		this.popcap = new PopCapService(rules, developments);
	}

	handleTieredResourceChange(ctx: EngineContext, resourceKey: ResourceKey) {
		if (resourceKey !== this.tieredResource.resourceKey) {
			return;
		}
		const player = ctx.activePlayer;
		const value = player.resources[resourceKey] ?? 0;
		const nextTier = this.tieredResource.definition(value);
		const currentTier = this.activeTiers.get(player.id);
		if (currentTier?.id === nextTier?.id) {
			return;
		}
		if (currentTier) {
			const exitEffects = currentTier.transition.exit;
			if (exitEffects && exitEffects.length > 0) {
				runEffects(exitEffects, ctx);
			}
			this.activeTiers.delete(player.id);
		}
		if (nextTier) {
			const entryEffects = nextTier.transition.enter;
			if (entryEffects && entryEffects.length > 0) {
				runEffects(entryEffects, ctx);
			}
			this.activeTiers.set(player.id, nextTier);
		}
	}

	initializeTierPassives(ctx: EngineContext) {
		const resourceKey = this.tieredResource.resourceKey;
		const previousIndex = ctx.game.currentPlayerIndex;
		ctx.game.players.forEach((_player, index) => {
			ctx.game.currentPlayerIndex = index;
			this.handleTieredResourceChange(ctx, resourceKey);
		});
		ctx.game.currentPlayerIndex = previousIndex;
	}

	clone(developments: Registry<DevelopmentConfig>): Services {
		const cloned = new Services(this.rules, developments);
		cloned.activeTiers = new Map(this.activeTiers);
		return cloned;
	}
}
