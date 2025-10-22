import type { ActionEffect, EffectConfig, RequirementConfig } from '@kingdom-builder/protocol';
import type { ActionDef } from '../../../actions';
import type { ActionCategoryId } from '../../../actionCategories';
import type { Focus } from '../../../defs';
import type { ResourceKey } from '../../../resources';
import { ActionEffectGroupBuilder } from '../actionEffectGroups';
import type { ActionEffectGroupDef } from '../actionEffectGroups';
import { RequirementBuilder } from '../evaluators';
import { BaseBuilder } from './baseBuilder';

type ActionBuilderConfig = ActionDef;

export class ActionBuilder extends BaseBuilder<ActionBuilderConfig> {
	private readonly effectGroupIds = new Set<string>();

	constructor() {
		super({ effects: [] }, 'Action');
	}

	category(category: ActionCategoryId) {
		this.config.category = category;
		return this;
	}

	order(order: number) {
		this.config.order = order;
		return this;
	}

	focus(focus: Focus) {
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
			throw new Error('Action effect groups can only be used on actions. ' + 'Use action().effectGroup(...).');
		}
		const built = group instanceof ActionEffectGroupBuilder ? group.build() : group;
		if (this.effectGroupIds.has(built.id)) {
			throw new Error(`Action effect group id "${built.id}" already exists on this action. ` + 'Use unique group ids.');
		}
		this.effectGroupIds.add(built.id);
		this.config.effects.push(built as ActionEffect);
		return this;
	}

	system(flag = true) {
		this.config.system = flag;
		return this;
	}
}
