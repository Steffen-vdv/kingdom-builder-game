import type { ResourceKey, PlayerId, PlayerState } from '../state';
import type { EngineContext } from '../context';
import type { DevelopmentConfig, Registry } from '@kingdom-builder/protocol';
import { runEffects } from '../effects';
import { TieredResourceService } from './tiered_resource_service';
import { PopCapService } from './pop_cap_service';
import { WinConditionService } from './win_condition_service';
import type { HappinessTierDefinition } from './tiered_resource_types';
import type { RuleSet } from './services_types';
import { getResourceV2Catalog } from '../state';
import { ResourceV2Service, type ResourceV2Change } from './resourceV2_service';

type Context = EngineContext;
type TierResource = ResourceKey;

export class Services {
	tieredResource: TieredResourceService;
	popcap: PopCapService;
	winCondition: WinConditionService;
	resourceV2: ResourceV2Service;
	private activeTiers: Map<PlayerId, Map<string, HappinessTierDefinition>> =
		new Map();
	private readonly resourceV2Catalog = getResourceV2Catalog();

	constructor(
		public rules: RuleSet,
		developments: Registry<DevelopmentConfig>,
	) {
		this.resourceV2 = new ResourceV2Service(
			this.resourceV2Catalog,
			(context, player, resourceId, change) =>
				this.handleResourceV2Change(context, player, resourceId, change),
		);
		this.tieredResource = new TieredResourceService(
			rules,
			this.resourceV2Catalog,
		);
		this.popcap = new PopCapService(rules, developments);
		this.winCondition = new WinConditionService(
			rules.winConditions ?? [],
			this.resourceV2,
		);
	}

	handleResourceChange(
		context: Context,
		player: PlayerState,
		key: TierResource,
	) {
		if (this.resourceV2.hasDefinition(key)) {
			return;
		}
		this.handleTieredResourceChange(context, player, key);
		this.winCondition.evaluateResourceChange(context, player, key);
	}

	handleTieredResourceChange(
		context: Context,
		player: PlayerState,
		tierKey: TierResource,
	) {
		const isResourceV2 = this.resourceV2.hasDefinition(tierKey);
		const isLegacyKey = tierKey === this.tieredResource.resourceKey;
		if (!isResourceV2 && !isLegacyKey) {
			return;
		}
		const value = isResourceV2
			? this.resourceV2.getValue(player, tierKey)
			: (player.resources[tierKey] ?? 0);
		const nextTier = this.tieredResource.definition(value, tierKey);
		const tiersForPlayer = this.ensureActiveTierMap(player.id);
		const currentTier = tiersForPlayer.get(tierKey);
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
				tiersForPlayer.delete(tierKey);
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
				tiersForPlayer.set(tierKey, nextTier);
			} else {
				tiersForPlayer.delete(tierKey);
			}
		} finally {
			if (playerIndex >= 0 && playerIndex !== originalIndex) {
				context.game.currentPlayerIndex = originalIndex;
			}
		}
	}

	initializeTierPassives(context: EngineContext) {
		const tracked = new Set<string>();
		const resourceKey = this.tieredResource.resourceKey;
		if (resourceKey) {
			tracked.add(resourceKey);
		}
		for (const id of this.tieredResource.trackedResourceIds()) {
			tracked.add(id);
		}
		const previousIndex = context.game.currentPlayerIndex;
		context.game.players.forEach((_player, index) => {
			context.game.currentPlayerIndex = index;
			const player = context.game.players[index]!;
			for (const key of tracked) {
				this.handleTieredResourceChange(context, player, key);
			}
		});
		context.game.currentPlayerIndex = previousIndex;
	}

	clone(developments: Registry<DevelopmentConfig>): Services {
		const cloned = new Services(this.rules, developments);
		cloned.resourceV2 = this.resourceV2.clone(
			(context, player, resourceId, change) =>
				cloned.handleResourceV2Change(context, player, resourceId, change),
		);
		cloned.winCondition = this.winCondition.clone(cloned.resourceV2);
		cloned.activeTiers = new Map(
			Array.from(this.activeTiers.entries()).map(([playerId, tierMap]) => [
				playerId,
				new Map(tierMap),
			]),
		);
		return cloned;
	}

	private ensureActiveTierMap(
		playerId: PlayerId,
	): Map<string, HappinessTierDefinition> {
		let tiers = this.activeTiers.get(playerId);
		if (!tiers) {
			tiers = new Map();
			this.activeTiers.set(playerId, tiers);
		}
		return tiers;
	}

	private handleResourceV2Change(
		context: EngineContext,
		player: PlayerState,
		resourceId: TierResource,
		change: ResourceV2Change,
	) {
		if (change.reason === 'value' && change.delta !== 0) {
			this.handleTieredResourceChange(context, player, resourceId);
			this.winCondition.evaluateResourceChange(context, player, resourceId);
		}
	}
}
