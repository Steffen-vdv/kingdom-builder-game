import type {
	ActionEffect,
	EffectConfig,
	RequirementConfig,
} from '@kingdom-builder/protocol';
import type { ActionDef, FocusValue, ResourceKey } from '../../../types';
import { ActionEffectGroupBuilder } from '../actionEffectGroups';
import type { ActionEffectGroupDef } from '../actionEffectGroups';
import { RequirementBuilder } from '../evaluators';
import { BaseBuilder } from './baseBuilder';

type ActionBuilderConfig = ActionDef;

export class ActionBuilder extends BaseBuilder<ActionBuilderConfig> {
	private readonly effectGroupIds = new Set<string>();
	private metaCategorySet = false;

	constructor() {
		// metaCategory is validated at build() time
		super({ effects: [] } as unknown as ActionBuilderConfig, 'Action');
	}

	/**
	 * Sets the meta-category for this action. Required for all actions.
	 * Games define their own meta-categories (e.g., 'commands', 'research').
	 */
	metaCategory(value: string) {
		if (this.metaCategorySet) {
			throw new Error(
				'Action already has metaCategory(). Remove the extra call.',
			);
		}
		this.config.metaCategory = value;
		this.metaCategorySet = true;
		return this;
	}

	category(category: string) {
		this.config.category = category;
		return this;
	}

	order(order: number) {
		this.config.order = order;
		return this;
	}

	focus(focus: FocusValue) {
		this.config.focus = focus;
		return this;
	}

	cost(key: ResourceKey, amount: number) {
		this.config.baseCosts = this.config.baseCosts || {};
		this.config.baseCosts[key] = amount;
		return this;
	}

	requirement(req: RequirementConfig | RequirementBuilder) {
		const built = req instanceof RequirementBuilder ? req.build() : req;
		this.config.requirements = this.config.requirements || [];
		this.config.requirements.push(built);
		return this;
	}

	effect(effect: EffectConfig) {
		this.config.effects.push(effect);
		return this;
	}

	effectGroup(group: ActionEffectGroupBuilder | ActionEffectGroupDef) {
		if (!(this instanceof ActionBuilder)) {
			throw new Error(
				'Action effect groups can only be used on actions. ' +
					'Use action().effectGroup(...).',
			);
		}
		const built =
			group instanceof ActionEffectGroupBuilder ? group.build() : group;
		if (this.effectGroupIds.has(built.id)) {
			throw new Error(
				`Action effect group id "${built.id}" already exists on this action. ` +
					'Use unique group ids.',
			);
		}
		this.effectGroupIds.add(built.id);
		this.config.effects.push(built as ActionEffect);
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
		if (!this.metaCategorySet) {
			throw new Error(
				'Action is missing metaCategory(). Call metaCategory() before build().',
			);
		}
		return super.build();
	}
}
