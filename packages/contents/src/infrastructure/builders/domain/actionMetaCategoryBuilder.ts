import type { PoolConfig } from '../pool';
import { PoolBuilder } from '../pool';

/**
 * Cost model for action meta-categories.
 * - 'global': All items share a uniform cost (e.g., 1 AP per action)
 * - 'per-item': Each item defines its own cost for the binding resource
 */
export type ActionMetaCategoryCostModel = 'global' | 'per-item';

/**
 * Visibility trigger for when to show a meta-category's UI panel.
 * - 'always': Panel is always visible
 * - 'resource-touched': Panel appears only after binding resource is touched
 */
export type ActionMetaCategoryVisibilityTrigger = 'always' | 'resource-touched';

export interface ActionMetaCategoryConfig {
	id: string;
	label: string;
	icon: string;
	bindingResourceId: string;
	costModel: ActionMetaCategoryCostModel;
	globalCostAmount?: number;
	visibilityTrigger: ActionMetaCategoryVisibilityTrigger;
	order: number;
	categoryIds?: readonly string[];
	/** Optional pool configuration for controlled action availability */
	pool?: PoolConfig;
}

export class ActionMetaCategoryBuilder {
	private readonly config: Partial<ActionMetaCategoryConfig> = {};
	private readonly assigned = new Set<keyof ActionMetaCategoryConfig>();

	private set<K extends keyof ActionMetaCategoryConfig>(key: K, value: ActionMetaCategoryConfig[K], message: string) {
		if (this.assigned.has(key)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(key);
		return this;
	}

	id(id: string) {
		return this.set('id', id, 'Action meta-category already set id(). Remove the extra id() call.');
	}

	label(label: string) {
		return this.set('label', label, 'Action meta-category already set label(). Remove the extra label() call.');
	}

	icon(icon: string) {
		return this.set('icon', icon, 'Action meta-category already set icon(). Remove the extra icon() call.');
	}

	/**
	 * Sets the resource this meta-category is bound to.
	 * For 'global' cost model, this resource's cost is applied to all items.
	 * For 'per-item', items define their own cost for this resource.
	 * UI visibility (when using 'resource-touched') is based on this resource.
	 */
	bindingResource(resourceId: string) {
		return this.set('bindingResourceId', resourceId, 'Action meta-category already set bindingResource(). Remove the extra call.');
	}

	/**
	 * Sets the cost model and optional global cost amount.
	 * @param model - 'global' or 'per-item'
	 * @param amount - Required for 'global' model, ignored for 'per-item'
	 */
	costModel(model: 'global', amount: number): this;
	costModel(model: 'per-item'): this;
	costModel(model: ActionMetaCategoryCostModel, amount?: number) {
		if (this.assigned.has('costModel')) {
			throw new Error('Action meta-category already set costModel(). Remove the extra call.');
		}
		this.config.costModel = model;
		this.assigned.add('costModel');

		if (model === 'global') {
			if (typeof amount !== 'number' || amount <= 0) {
				throw new Error('Action meta-category with global cost model requires a positive amount.');
			}
			this.config.globalCostAmount = amount;
		} else if (amount !== undefined) {
			throw new Error('Action meta-category with per-item cost model should not specify an amount.');
		}
		return this;
	}

	/**
	 * Sets when this meta-category's UI panel becomes visible.
	 * - 'always': Panel is always shown
	 * - 'resource-touched': Panel appears after binding resource is first modified
	 */
	visibilityTrigger(trigger: ActionMetaCategoryVisibilityTrigger) {
		return this.set('visibilityTrigger', trigger, 'Action meta-category already set visibilityTrigger(). Remove the extra call.');
	}

	order(order: number) {
		return this.set('order', order, 'Action meta-category already set order(). Remove the extra order() call.');
	}

	/**
	 * Sets the sub-category IDs for grouping within this meta-category.
	 * Only applicable for meta-categories that use sub-categorization (e.g., actions).
	 */
	categories(...categoryIds: string[]) {
		if (this.assigned.has('categoryIds')) {
			throw new Error('Action meta-category already set categories(). Remove the extra call.');
		}
		this.config.categoryIds = categoryIds;
		this.assigned.add('categoryIds');
		return this;
	}

	/**
	 * Sets the pool configuration for controlled action availability.
	 * When configured, the engine maintains a pool of available actions
	 * that gets refreshed as actions are completed.
	 * @param poolConfig Pool builder or config
	 */
	pool(poolConfig: PoolBuilder | PoolConfig) {
		if (this.assigned.has('pool')) {
			throw new Error('Action meta-category already set pool(). Remove the extra call.');
		}
		const config = poolConfig instanceof PoolBuilder ? poolConfig.build() : poolConfig;
		this.config.pool = config;
		this.assigned.add('pool');
		return this;
	}

	build(): ActionMetaCategoryConfig {
		if (!this.config.id) {
			throw new Error("Action meta-category is missing id(). Call id('unique-id') before build().");
		}
		if (!this.config.label) {
			throw new Error("Action meta-category is missing label(). Call label('Readable label') before build().");
		}
		if (!this.config.icon) {
			throw new Error("Action meta-category is missing icon(). Call icon('icon-id') before build().");
		}
		if (!this.config.bindingResourceId) {
			throw new Error("Action meta-category is missing bindingResource(). Call bindingResource('resource-id') before build().");
		}
		if (!this.config.costModel) {
			throw new Error("Action meta-category is missing costModel(). Call costModel('global', amount) or costModel('per-item') before build().");
		}
		if (!this.config.visibilityTrigger) {
			throw new Error("Action meta-category is missing visibilityTrigger(). Call visibilityTrigger('resource-touched') before build().");
		}
		if (typeof this.config.order !== 'number') {
			throw new Error('Action meta-category is missing order(). Call order(number) before build().');
		}

		return {
			id: this.config.id,
			label: this.config.label,
			icon: this.config.icon,
			bindingResourceId: this.config.bindingResourceId,
			costModel: this.config.costModel,
			...(this.config.globalCostAmount !== undefined ? { globalCostAmount: this.config.globalCostAmount } : {}),
			visibilityTrigger: this.config.visibilityTrigger,
			order: this.config.order,
			...(this.config.categoryIds !== undefined ? { categoryIds: this.config.categoryIds } : {}),
			...(this.config.pool !== undefined ? { pool: this.config.pool } : {}),
		};
	}
}
