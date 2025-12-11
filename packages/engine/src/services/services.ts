import type { PlayerId, PlayerState } from '../state';
import type { EngineContext } from '../context';
import type { DevelopmentConfig, Registry } from '@kingdom-builder/protocol';
import { applyParamsToEffects } from '@kingdom-builder/protocol';
import { runEffects } from '../effects';
import { withResourceSourceFrames } from '../resource_sources';
import { resolveResourceDefinition } from '../resource/state-helpers';
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
		delta?: number,
	) {
		this.handleTieredResourceChange(context, player, key);
		this.winCondition.evaluateResourceChange(context, player, key);
		// Handle resource-defined triggers when value changes
		if (delta !== undefined && delta !== 0) {
			this.handleResourceTriggers(context, player, key, delta);
		}
	}

	/**
	 * Run onValueIncrease/onValueDecrease triggers defined on the resource.
	 * Triggers are run once per unit of change.
	 */
	private handleResourceTriggers(
		context: Context,
		player: PlayerState,
		resourceId: ResourceIdentifier,
		delta: number,
	) {
		// Look up the resource definition from the catalog
		const catalog = context.resourceCatalog;
		const lookup = resolveResourceDefinition(catalog, resourceId);
		if (!lookup || lookup.kind !== 'resource') {
			return;
		}
		const definition = lookup.definition;

		const currentValue = player.resourceValues[resourceId] ?? 0;
		const iterations = Math.abs(delta);

		if (delta > 0 && definition.onValueIncrease.length > 0) {
			// Run onValueIncrease triggers for each unit added
			for (let i = 0; i < iterations; i++) {
				const index = currentValue - iterations + i + 1;
				const effects = applyParamsToEffects([...definition.onValueIncrease], {
					delta: 1,
					index,
					player: player.id,
					resourceId,
				});
				const frames = [
					() => ({
						kind: 'resource' as const,
						id: resourceId,
						longevity: 'ongoing' as const,
						dependsOn: [
							{
								type: 'resource',
								id: resourceId,
								detail: 'increased',
							},
						],
						removal: {
							type: 'resource',
							id: resourceId,
							detail: 'decreased',
						},
					}),
				];
				withResourceSourceFrames(context, frames, () =>
					runEffects(effects, context),
				);
			}
		} else if (delta < 0 && definition.onValueDecrease.length > 0) {
			// Run onValueDecrease triggers for each unit removed
			// Note: triggers run after the value is already decremented,
			// so we compute indices based on what they would have been
			for (let i = 0; i < iterations; i++) {
				const index = currentValue + iterations - i;
				const effects = applyParamsToEffects([...definition.onValueDecrease], {
					delta: -1,
					index,
					player: player.id,
					resourceId,
				});
				const frames = [
					() => ({
						kind: 'resource' as const,
						id: resourceId,
						longevity: 'ongoing' as const,
						dependsOn: [
							{
								type: 'resource',
								id: resourceId,
								detail: 'increased',
							},
						],
						removal: {
							type: 'resource',
							id: resourceId,
							detail: 'decreased',
						},
					}),
				];
				withResourceSourceFrames(context, frames, () =>
					runEffects(effects, context),
				);
			}
		}
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
					this.tieredResource.matches(entry.resourceId),
				);
				if (!alreadyLogged) {
					context.recentResourceGains.push({
						resourceId: this.tieredResource.getLogIdentifier(),
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
					// Wrap exit effects with tier frame so they don't inherit
					// parent action source
					withResourceSourceFrames(
						context,
						() => ({
							kind: 'tier' as const,
							id: currentTier.id,
							longevity: 'ongoing' as const,
						}),
						() => runEffects(exitEffects, context),
					);
				}
				this.activeTiers.delete(player.id);
			}
			if (nextTier) {
				const enterEffects = nextTier.enterEffects ?? [];
				if (enterEffects.length) {
					// Wrap enter effects with tier frame so they don't inherit
					// parent action source (e.g., initial setup)
					withResourceSourceFrames(
						context,
						() => ({
							kind: 'tier' as const,
							id: nextTier.id,
							longevity: 'ongoing' as const,
						}),
						() => runEffects(enterEffects, context),
					);
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
