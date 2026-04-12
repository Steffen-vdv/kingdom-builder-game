import type { ActionTiersConfig } from '@boardsmith/protocol';
import { BaseBuilder } from '@boardsmith/contents-sdk';
import type { ActionDef } from '@boardsmith/contents-sdk';
import { ActionTierBuilder, type ActionTierConfig } from './actionTierBuilder';

type ActionBuilderConfig = ActionDef;

type TierConfigurator = (builder: ActionTierBuilder) => ActionTierBuilder;

export class ActionBuilder extends BaseBuilder<ActionBuilderConfig> {
	private readonly tiersMap: Map<number, ActionTierConfig> = new Map();
	private metaCategorySet = false;
	private oneTimeSet = false;

	constructor() {
		// metaCategory is validated at build() time - using placeholder here
		// tiers is now required and will be set via tier() method
		super({ tiers: {} } as unknown as Omit<ActionDef, 'id' | 'name'>, 'Action');
	}

	/**
	 * Sets the meta-category for this action. Required for all actions.
	 * @param metaCategory - The meta-category ID (e.g., MetaCategory.Commands)
	 */
	metaCategory(metaCategory: string) {
		if (this.metaCategorySet) {
			throw new Error('Action already has metaCategory().' + ' Remove the extra call.');
		}
		(this.config as Record<string, unknown>).metaCategory = metaCategory;
		this.metaCategorySet = true;
		return this;
	}

	category(category: string) {
		(this.config as Record<string, unknown>).category = category;
		return this;
	}

	order(order: number) {
		this.config.order = order;
		return this;
	}

	focus(focus: string) {
		(this.config as Record<string, unknown>).focus = focus;
		return this;
	}

	/**
	 * Adds a tier to this action with its costs, effects, and requirements.
	 * @param tierNumber The tier number (must be positive integer)
	 * @param config The tier configuration or a callback that builds it
	 */
	tier(tierNumber: number, config: ActionTierConfig | ActionTierBuilder | TierConfigurator): this {
		if (!Number.isInteger(tierNumber) || tierNumber < 1) {
			throw new Error(`Action tier number must be a positive integer, got ${tierNumber}`);
		}
		if (this.tiersMap.has(tierNumber)) {
			throw new Error(`Action already has tier ${tierNumber}. ` + 'Each tier number can only be defined once.');
		}

		let tierConfig: ActionTierConfig;
		if (typeof config === 'function') {
			tierConfig = config(new ActionTierBuilder()).build();
		} else if (config instanceof ActionTierBuilder) {
			tierConfig = config.build();
		} else {
			tierConfig = config;
		}

		this.tiersMap.set(tierNumber, tierConfig);
		return this;
	}

	/**
	 * Marks this action as one-time (locks after each tier completion).
	 * For pooled meta-categories, the action returns to the candidate pool
	 * at the next tier after completion.
	 */
	oneTime(flag = true): this {
		if (this.oneTimeSet) {
			throw new Error('Action already has oneTime(). Remove the extra oneTime() call.');
		}
		this.config.oneTime = flag;
		this.oneTimeSet = true;
		return this;
	}

	/**
	 * Marks this action as a system action, optionally with a specific role.
	 * System actions are run by the engine at specific moments (e.g., game start).
	 *
	 * @param role Optional system role (e.g., 'initial-setup', 'compensation').
	 *             If true/undefined, marks as system without a specific role.
	 */
	system(role?: string | boolean) {
		if (typeof role === 'string') {
			this.config.system = true;
			this.config.systemRole = role;
		} else {
			this.config.system = role ?? true;
		}
		return this;
	}

	/**
	 * Marks this action as locked (not available to players initially).
	 * Locked actions can be unlocked via the action:add effect.
	 * Use for player-facing actions that should be gated behind progression.
	 */
	locked(flag = true) {
		this.config.locked = flag;
		return this;
	}

	/**
	 * Marks this action as free (bypasses global action cost like AP).
	 * Only valid for system actions. Call after `.system()`.
	 */
	free(flag = true) {
		this.config.free = flag;
		return this;
	}

	override build(): ActionBuilderConfig {
		if (this.config.id === undefined) {
			throw new Error("Action is missing id(). Call id('unique-id') before build().");
		}
		if (this.config.name === undefined) {
			throw new Error("Action is missing name(). Call name('Readable name') before build().");
		}
		if (!this.metaCategorySet) {
			throw new Error('Action is missing metaCategory(). Call metaCategory() before build().');
		}
		if (this.tiersMap.size === 0) {
			throw new Error('Action must have at least one tier. ' + 'Call tier(1, t => t.effect(...)) before build().');
		}

		// Validate consecutive tiers
		const tierNumbers = Array.from(this.tiersMap.keys()).sort((a, b) => a - b);
		const minTier = tierNumbers[0]!;
		for (let i = 0; i < tierNumbers.length; i++) {
			const expected = minTier + i;
			if (tierNumbers[i] !== expected) {
				throw new Error(`Action tiers must be consecutive. ` + `Found gap: expected tier ${expected} but got ${tierNumbers[i]}.`);
			}
		}

		// Convert Map to Record for the config
		const tiers: ActionTiersConfig = {};
		for (const [tierNum, tierConfig] of this.tiersMap) {
			tiers[tierNum] = tierConfig;
		}
		this.config.tiers = tiers;

		return super.build();
	}
}
