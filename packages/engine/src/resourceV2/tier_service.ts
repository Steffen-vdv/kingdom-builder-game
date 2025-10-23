import type { EngineContext } from '../context';
import type { PlayerState, PlayerResourceV2TierState } from '../state';
import { runEffects } from '../effects';
import type {
	ResourceV2EngineRegistry,
	ResourceV2TierDefinition,
	ResourceV2TierTrackDefinition,
} from './registry';

interface EvaluateOptions {
	force?: boolean;
}

export class ResourceV2TierService {
	private registry: ResourceV2EngineRegistry | undefined;
	private readonly activeTiers = new Map<
		string,
		Map<string, ResourceV2TierDefinition>
	>();

	constructor(registry?: ResourceV2EngineRegistry) {
		this.registry = registry;
	}

	setRegistry(registry: ResourceV2EngineRegistry) {
		this.registry = registry;
	}

	clone(): ResourceV2TierService {
		const clone = new ResourceV2TierService(this.registry);
		for (const [playerId, tiers] of this.activeTiers.entries()) {
			clone.activeTiers.set(playerId, new Map(tiers));
		}
		return clone;
	}

	initialize(context: EngineContext) {
		if (!this.registry) {
			return;
		}

		const previousIndex = context.game.currentPlayerIndex;
		context.game.players.forEach((player, playerIndex) => {
			if (playerIndex !== previousIndex) {
				context.game.currentPlayerIndex = playerIndex;
			}
			const resourceIds = player.resourceV2.resourceIds;
			for (const resourceId of resourceIds) {
				this.evaluateResource(context, player, resourceId, { force: true });
			}
			const parentIds = player.resourceV2.parentIds;
			for (const parentId of parentIds) {
				this.evaluateResource(context, player, parentId, { force: true });
			}
		});
		context.game.currentPlayerIndex = previousIndex;
	}

	handleValueChange(
		context: EngineContext,
		player: PlayerState,
		resourceId: string,
	) {
		this.evaluateResource(context, player, resourceId);

		let parentId = player.resourceV2.childToParent[resourceId];
		const visited = new Set<string>();
		while (parentId) {
			if (visited.has(parentId)) {
				break;
			}
			visited.add(parentId);
			this.evaluateResource(context, player, parentId);
			parentId = player.resourceV2.childToParent[parentId];
		}
	}

	private evaluateResource(
		context: EngineContext,
		player: PlayerState,
		resourceId: string,
		options: EvaluateOptions = {},
	) {
		if (!this.registry) {
			return;
		}

		const track = this.registry.getTierTrack(resourceId);
		if (!track || track.tiers.length === 0) {
			this.clearActiveTier(player.id, resourceId);
			return;
		}

		const currentTier = this.getActiveTier(player.id, resourceId);
		const amount = player.resourceV2.amounts[resourceId] ?? 0;
		const nextTier = findTierForAmount(track, amount);
		this.updateTierState(player, resourceId, track, nextTier);

		if (!options.force && currentTier?.id === nextTier?.id) {
			if (nextTier) {
				this.syncPassiveMetadata(context, player, resourceId, nextTier);
			}
			return;
		}

		const previousIndex = context.game.currentPlayerIndex;
		const playerIndex = context.game.players.indexOf(player);
		if (playerIndex >= 0 && playerIndex !== previousIndex) {
			context.game.currentPlayerIndex = playerIndex;
		}
		try {
			if (currentTier) {
				const exitEffects = currentTier.exitEffects
					? [...currentTier.exitEffects]
					: [];
				if (exitEffects.length) {
					runEffects(exitEffects, context);
				}
				this.clearActiveTier(player.id, resourceId);
			}
			if (nextTier) {
				const enterEffects = nextTier.enterEffects
					? [...nextTier.enterEffects]
					: [];
				if (enterEffects.length) {
					runEffects(enterEffects, context);
				}
				this.setActiveTier(player.id, resourceId, nextTier);
				this.syncPassiveMetadata(context, player, resourceId, nextTier);
			} else {
				this.clearActiveTier(player.id, resourceId);
			}
		} finally {
			if (playerIndex >= 0 && playerIndex !== previousIndex) {
				context.game.currentPlayerIndex = previousIndex;
			}
		}
	}

	private updateTierState(
		player: PlayerState,
		resourceId: string,
		track: ResourceV2TierTrackDefinition,
		tier: ResourceV2TierDefinition | undefined,
	) {
		const state: PlayerResourceV2TierState = {
			trackId: track.id,
		};
		if (tier) {
			state.tierId = tier.id;
			const index = track.tiers.findIndex((entry) => entry.id === tier.id);
			if (index > 0) {
				state.previousTierId = track.tiers[index - 1]!.id;
			} else {
				delete state.previousTierId;
			}
			if (index >= 0 && index + 1 < track.tiers.length) {
				state.nextTierId = track.tiers[index + 1]!.id;
			} else {
				delete state.nextTierId;
			}
		} else {
			delete state.tierId;
			delete state.previousTierId;
			const first = track.tiers[0];
			if (first) {
				state.nextTierId = first.id;
			} else {
				delete state.nextTierId;
			}
		}
		player.resourceV2.tiers[resourceId] = state;
	}

	private syncPassiveMetadata(
		context: EngineContext,
		player: PlayerState,
		resourceId: string,
		tier: ResourceV2TierDefinition,
	) {
		const passive = context.passives.get(tier.id, player.id);
		if (!passive) {
			return;
		}
		const display = tier.display;
		const summary = display?.summary;
		if (summary) {
			passive.detail = summary;
		}
		const existingMeta = passive.meta ?? {};
		const previousSource = existingMeta.source ?? {};
		const nextSource: typeof previousSource & {
			type: string;
			id: string;
			resourceId: string;
			label?: string;
		} = {
			...previousSource,
			type: 'resource-v2-tier',
			id: tier.id,
			resourceId,
		};
		if (summary) {
			nextSource.label = summary;
		}
		const removalCondition = display?.removalCondition;
		const nextRemoval = removalCondition
			? {
					...(existingMeta.removal ?? {}),
					text: removalCondition,
				}
			: existingMeta.removal;
		passive.meta = {
			...existingMeta,
			source: nextSource,
			...(nextRemoval ? { removal: nextRemoval } : {}),
		};
	}

	private getActiveTier(playerId: string, resourceId: string) {
		return this.activeTiers.get(playerId)?.get(resourceId);
	}

	private setActiveTier(
		playerId: string,
		resourceId: string,
		tier: ResourceV2TierDefinition,
	) {
		let tiers = this.activeTiers.get(playerId);
		if (!tiers) {
			tiers = new Map();
			this.activeTiers.set(playerId, tiers);
		}
		tiers.set(resourceId, tier);
	}

	private clearActiveTier(playerId: string, resourceId: string) {
		const tiers = this.activeTiers.get(playerId);
		if (!tiers) {
			return;
		}
		tiers.delete(resourceId);
		if (tiers.size === 0) {
			this.activeTiers.delete(playerId);
		}
	}
}

function findTierForAmount(
	track: ResourceV2TierTrackDefinition,
	amount: number,
): ResourceV2TierDefinition | undefined {
	for (const tier of track.tiers) {
		const minimum = tier.range.min;
		const maximum = tier.range.max ?? Number.POSITIVE_INFINITY;
		if (amount < minimum) {
			continue;
		}
		if (amount >= maximum) {
			continue;
		}
		return tier;
	}

	if (track.tiers.length === 0) {
		return undefined;
	}

	const lastTier = track.tiers[track.tiers.length - 1]!;
	if (amount >= lastTier.range.min) {
		return lastTier;
	}

	return undefined;
}
