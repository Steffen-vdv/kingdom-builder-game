import type { PlayerId, PlayerState } from '../state';
import type { EngineContext } from '../context';
import type { DevelopmentConfig, Registry } from '@kingdom-builder/protocol';
import { runEffects } from '../effects';
import { TieredResourceService } from './tiered_resource_service';
import { PopCapService } from './pop_cap_service';
import { WinConditionService } from './win_condition_service';
import type { HappinessTierDefinition } from './tiered_resource_types';
import type { RuleSet } from './services_types';

type Context = EngineContext;
type ResourceIdentifier = string;

export class Services {
	tieredResource: TieredResourceService;
	popcap: PopCapService;
	winCondition: WinConditionService;
	private activeTiers: Map<PlayerId, HappinessTierDefinition> = new Map();
	private tierResourceValues: Map<PlayerId, number> = new Map();

	constructor(
		public rules: RuleSet,
		developments: Registry<DevelopmentConfig>,
	) {
		this.tieredResource = new TieredResourceService(rules);
		this.popcap = new PopCapService(rules, developments);
		this.winCondition = new WinConditionService(rules.winConditions ?? []);
	}

	handleResourceChange(
		context: Context,
		player: PlayerState,
		key: ResourceIdentifier,
	) {
		this.handleTieredResourceChange(context, player, key);
		this.winCondition.evaluateResourceChange(context, player, key);
	}

	handleTieredResourceChange(
		context: Context,
		player: PlayerState,
		resourceIdentifier: ResourceIdentifier,
	) {
		if (!this.tieredResource.matches(resourceIdentifier)) {
			return;
		}
		const previousValue = this.tierResourceValues.get(player.id) ?? null;
		const value = this.tieredResource.valueFor(player);
		const nextTier = this.tieredResource.tierFor(player);
		const currentTier = this.activeTiers.get(player.id);
		const tierChanged = currentTier?.id !== nextTier?.id;
		const valueChanged = previousValue === null || previousValue !== value;
		if (!tierChanged && !valueChanged) {
			return;
		}
		if (valueChanged && previousValue !== null) {
			const delta = value - previousValue;
			if (delta !== 0) {
				const alreadyLogged = context.recentResourceGains.some((entry) =>
					this.tieredResource.matches(entry.key),
				);
				if (!alreadyLogged) {
					context.recentResourceGains.push({
						key: this.tieredResource.getLogIdentifier(),
						amount: delta,
					});
				}
			}
		}
		if (!tierChanged) {
			this.tierResourceValues.set(player.id, value);
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
		this.tierResourceValues.set(player.id, value);
	}

	initializeTierPassives(context: EngineContext) {
		const resourceKey = this.tieredResource.resourceId;
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
		cloned.tierResourceValues = new Map(this.tierResourceValues);
		cloned.winCondition = this.winCondition.clone();
		return cloned;
	}
}
