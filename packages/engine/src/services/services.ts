import type { EngineContext as Context } from '../context';
import type {
	PlayerState as Player,
	PlayerId,
	ResourceKey as Resource,
} from '../state';
import type { DevelopmentConfig } from '../config/schema';
import type { Registry } from '../registry';
import type {
	PassiveMetadata,
	PassiveRemovalMetadata,
	PassiveSourceMetadata,
} from './passive_manager';
import { PopulationCapService } from './population_cap_service';
import {
	TieredResourceService,
	type HappinessTierDefinition,
	type TierPassivePayload as TierPassive,
	type RuleSet,
} from './tiered_resource_service';

export class Services {
	tieredResource: TieredResourceService;
	populationCap: PopulationCapService;
	private activeTiers: Map<PlayerId, HappinessTierDefinition> = new Map();

	constructor(
		public rules: RuleSet,
		developments: Registry<DevelopmentConfig>,
	) {
		this.tieredResource = new TieredResourceService(rules);
		this.populationCap = new PopulationCapService(rules, developments);
	}

	private registerSkipFlags(player: Player, passive: TierPassive) {
		const skip = passive.skip;
		if (!skip) {
			return;
		}
		const sourceId = passive.id;
		if (skip.phases) {
			for (const phaseId of skip.phases) {
				const phaseBucket = player.skipPhases[phaseId] ?? {};
				phaseBucket[sourceId] = true;
				player.skipPhases[phaseId] = phaseBucket;
			}
		}
		if (skip.steps) {
			for (const { phaseId, stepId } of skip.steps) {
				const phaseBucket = player.skipSteps[phaseId] ?? {};
				const stepBucket = phaseBucket[stepId] ?? {};
				stepBucket[sourceId] = true;
				phaseBucket[stepId] = stepBucket;
				player.skipSteps[phaseId] = phaseBucket;
			}
		}
	}

	private clearSkipFlags(player: Player, passive: TierPassive) {
		const skip = passive.skip;
		if (!skip) {
			return;
		}
		const sourceId = passive.id;
		if (skip.phases) {
			for (const phaseId of skip.phases) {
				const bucket = player.skipPhases[phaseId];
				if (!bucket) {
					continue;
				}
				delete bucket[sourceId];
				if (Object.keys(bucket).length === 0) {
					delete player.skipPhases[phaseId];
				}
			}
		}
		if (skip.steps) {
			for (const { phaseId, stepId } of skip.steps) {
				const phaseBucket = player.skipSteps[phaseId];
				if (!phaseBucket) {
					continue;
				}
				const stepBucket = phaseBucket[stepId];
				if (!stepBucket) {
					continue;
				}
				delete stepBucket[sourceId];
				if (Object.keys(stepBucket).length === 0) {
					delete phaseBucket[stepId];
				}
				if (Object.keys(phaseBucket).length === 0) {
					delete player.skipSteps[phaseId];
				}
			}
		}
	}

	handleTieredResourceChange(context: Context, resourceKey: Resource) {
		if (resourceKey !== this.tieredResource.resourceKey) {
			return;
		}
		const player = context.activePlayer;
		const value = player.resources[resourceKey] ?? 0;
		const nextTier = this.tieredResource.definition(value);
		const currentTier = this.activeTiers.get(player.id);
		if (currentTier?.id === nextTier?.id) {
			return;
		}
		if (currentTier) {
			this.clearSkipFlags(player, currentTier.passive);
			context.passives.removePassive(currentTier.passive.id, context);
			this.activeTiers.delete(player.id);
		}
		if (nextTier) {
			const sourceMeta: PassiveSourceMetadata = {
				type: 'tiered-resource',
				id: nextTier.id,
			};
			if (nextTier.display?.icon) {
				sourceMeta.icon = nextTier.display.icon;
			}
			if (nextTier.display?.summaryToken) {
				sourceMeta.labelToken = nextTier.display.summaryToken;
			}
			const removalMeta: PassiveRemovalMetadata = {};
			if (nextTier.display?.removalCondition) {
				removalMeta.token = nextTier.display.removalCondition;
			}
			if (nextTier.passive.text?.removal) {
				removalMeta.text = nextTier.passive.text.removal;
			}
			const metadata: PassiveMetadata = {
				source: sourceMeta,
			};
			if (Object.keys(removalMeta).length > 0) {
				metadata.removal = removalMeta;
			}
			const detailText = nextTier.passive.text?.summary ?? nextTier.id;
			context.passives.addPassive(nextTier.passive, context, {
				detail: detailText,
				meta: metadata,
			});
			this.registerSkipFlags(player, nextTier.passive);
			this.activeTiers.set(player.id, nextTier);
		}
	}

	initializeTierPassives(context: Context) {
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
