import type { ActionEffect, EffectConfig, RequirementConfig } from '@kingdom-builder/protocol';
import { ActionEffectGroupBuilder, RequirementBuilder, type ActionEffectGroupDef } from '@kingdom-builder/contents-sdk';
import type { ResourceKey } from '../../../internal';

/**
 * Configuration for a single tier of an action.
 */
export interface ActionTierConfig {
	readonly costs?: Record<string, number>;
	readonly effects: ActionEffect[];
	readonly requirements?: RequirementConfig[];
}

export class ActionTierBuilder {
	private readonly costsMap: Record<string, number> = {};
	private readonly effectsList: ActionEffect[] = [];
	private readonly requirementsList: RequirementConfig[] = [];
	private readonly effectGroupIds = new Set<string>();

	/**
	 * Adds a resource cost for this tier.
	 * @param key The resource key
	 * @param amount The cost amount
	 */
	cost(key: ResourceKey, amount: number): this {
		if (typeof amount !== 'number' || amount < 0) {
			throw new Error(`ActionTier cost amount must be a non-negative number, got ${amount}`);
		}
		this.costsMap[key] = amount;
		return this;
	}

	/**
	 * Adds an effect to this tier.
	 * @param effect The effect config
	 */
	effect(effect: EffectConfig): this {
		this.effectsList.push(effect);
		return this;
	}

	/**
	 * Adds an effect group to this tier.
	 * @param group The effect group builder or config
	 */
	effectGroup(group: ActionEffectGroupBuilder | ActionEffectGroupDef): this {
		const built = group instanceof ActionEffectGroupBuilder ? group.build() : group;
		if (this.effectGroupIds.has(built.id)) {
			throw new Error(`ActionTier effect group id "${built.id}" already exists. ` + 'Use unique group ids.');
		}
		this.effectGroupIds.add(built.id);
		this.effectsList.push(built as ActionEffect);
		return this;
	}

	/**
	 * Adds a requirement for this tier.
	 * @param req The requirement config or builder
	 */
	requirement(req: RequirementConfig | RequirementBuilder): this {
		const built = req instanceof RequirementBuilder ? req.build() : req;
		this.requirementsList.push(built);
		return this;
	}

	build(): ActionTierConfig {
		if (this.effectsList.length === 0) {
			throw new Error('ActionTier must have at least one effect. ' + 'Call effect() or effectGroup() before build().');
		}

		const config: ActionTierConfig = {
			effects: [...this.effectsList],
		};

		if (Object.keys(this.costsMap).length > 0) {
			(config as { costs: Record<string, number> }).costs = {
				...this.costsMap,
			};
		}

		if (this.requirementsList.length > 0) {
			(config as { requirements: RequirementConfig[] }).requirements = [...this.requirementsList];
		}

		return config;
	}
}

/**
 * Creates a new action tier builder.
 */
export function actionTier(): ActionTierBuilder {
	return new ActionTierBuilder();
}
