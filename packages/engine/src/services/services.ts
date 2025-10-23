import type {
	ResourceKey,
	PlayerId,
	PlayerState,
	ResourceV2Key,
} from '../state';
import type { EngineContext } from '../context';
import type { DevelopmentConfig, Registry } from '@kingdom-builder/protocol';
import { runEffects } from '../effects';
import { TieredResourceService } from './tiered_resource_service';
import { PopCapService } from './pop_cap_service';
import { WinConditionService } from './win_condition_service';
import type { HappinessTierDefinition } from './tiered_resource_types';
import type { RuleSet } from './services_types';
import { ResourceV2Service } from './resourceV2_service';
import { getResourceV2Definition } from '../state';

type Context = EngineContext;
type TierResource = ResourceKey;

export class Services {
	tieredResource: TieredResourceService;
	popcap: PopCapService;
	winCondition: WinConditionService;
	resourceV2: ResourceV2Service;
	private activeTiers: Map<PlayerId, HappinessTierDefinition> = new Map();

	constructor(
		public rules: RuleSet,
		developments: Registry<DevelopmentConfig>,
	) {
		this.tieredResource = new TieredResourceService(rules);
		this.popcap = new PopCapService(rules, developments);
		this.winCondition = new WinConditionService(rules.winConditions ?? []);
		this.resourceV2 = new ResourceV2Service((context, player, resourceId) =>
			this.handleResourceV2Change(context, player, resourceId),
		);
	}

	handleResourceChange(
		context: Context,
		player: PlayerState,
		key: TierResource,
	) {
		this.handleTieredResourceChange(context, player, key);
		this.winCondition.evaluateResourceChange(context, player, key);
	}

	private handleResourceV2Change(
		context: Context,
		player: PlayerState,
		resourceId: ResourceV2Key,
	): void {
		const definition = getResourceV2Definition(resourceId);
		const tierKey = this.tieredResource.resourceKey;
		if (resourceId === tierKey) {
			this.handleTieredResourceChange(context, player, tierKey);
		}
		const legacyKey = this.resolveLegacyResourceKey(
			player,
			resourceId,
			definition,
		);
		if (legacyKey) {
			this.winCondition.evaluateResourceChange(context, player, legacyKey);
			if (legacyKey !== tierKey) {
				this.handleTieredResourceChange(context, player, legacyKey);
			}
			return;
		}
		if (resourceId !== tierKey) {
			return;
		}
	}

	private resolveLegacyResourceKey(
		player: PlayerState,
		resourceId: ResourceV2Key,
		definition: ReturnType<typeof getResourceV2Definition>,
	): ResourceKey | undefined {
		const metadataKey = definition?.metadata?.legacyResourceKey;
		if (typeof metadataKey === 'string') {
			return metadataKey;
		}
		if (Object.prototype.hasOwnProperty.call(player.resources, resourceId)) {
			return resourceId;
		}
		return undefined;
	}

	handleTieredResourceChange(
		context: Context,
		player: PlayerState,
		tierKey: TierResource,
	) {
		if (tierKey !== this.tieredResource.resourceKey) {
			return;
		}
		const value = player.resources[tierKey] ?? 0;
		const nextTier = this.tieredResource.definition(value);
		const currentTier = this.activeTiers.get(player.id);
		if (currentTier?.id === nextTier?.id) {
			return;
		}
		const originalIndex = context.game.currentPlayerIndex;
		const playerIndex = context.game.players.indexOf(player);
		if (playerIndex >= 0 && playerIndex !== originalIndex) {
			context.game.currentPlayerIndex = playerIndex;
		}
		try {
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
		} finally {
			if (playerIndex >= 0 && playerIndex !== originalIndex) {
				context.game.currentPlayerIndex = originalIndex;
			}
		}
	}

	initializeTierPassives(context: EngineContext) {
		const resourceKey = this.tieredResource.resourceKey;
		const previousIndex = context.game.currentPlayerIndex;
		context.game.players.forEach((_player, index) => {
			context.game.currentPlayerIndex = index;
			const player = context.game.players[index]!;
			this.handleTieredResourceChange(context, player, resourceKey);
		});
		context.game.currentPlayerIndex = previousIndex;
	}

	clone(developments: Registry<DevelopmentConfig>): Services {
		const cloned = new Services(this.rules, developments);
		cloned.activeTiers = new Map(this.activeTiers);
		cloned.winCondition = this.winCondition.clone();
		return cloned;
	}
}
