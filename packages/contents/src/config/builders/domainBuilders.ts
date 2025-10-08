/* eslint-disable max-lines */

import type {
	ActionEffect,
	EffectConfig,
	PopulationConfig,
	RequirementConfig,
} from '@kingdom-builder/protocol';
import type { ActionCategory, ActionDef } from '../../actions';
import type { BuildingDef, DevelopmentDef, Focus } from '../../defs';
import type { PopulationRoleId } from '../../populationRoles';
import type { ResourceKey } from '../../resources';
import type { StatKey } from '../../stats';
import { ActionEffectGroupBuilder } from './actionEffectGroups';
import type { ActionEffectGroupDef } from './actionEffectGroups';
import { RequirementBuilder } from './evaluators';

type BaseBuilderConfig<T extends { id: string; name: string }> = Omit<
	T,
	'id' | 'name'
> &
	Partial<Pick<T, 'id' | 'name'>> & { icon?: string };
export class BaseBuilder<T extends { id: string; name: string }> {
	protected config: BaseBuilderConfig<T>;
	private readonly kind: string;
	private idSet = false;
	private nameSet = false;
	private iconSet = false;

	constructor(base: Omit<T, 'id' | 'name'>, kind: string) {
		this.kind = kind;
		this.config = {
			...base,
		} as BaseBuilderConfig<T>;
	}

	id(id: string) {
		if (this.idSet) {
			throw new Error(
				`${this.kind} already has an id(). Remove the extra id() call.`,
			);
		}
		this.config.id = id;
		this.idSet = true;
		return this;
	}

	name(name: string) {
		if (this.nameSet) {
			throw new Error(
				`${this.kind} already has a name(). Remove the extra name() call.`,
			);
		}
		this.config.name = name;
		this.nameSet = true;
		return this;
	}

	icon(icon: string) {
		if (this.iconSet) {
			throw new Error(
				`${this.kind} already has an icon(). Remove the extra icon() call.`,
			);
		}
		this.config.icon = icon;
		this.iconSet = true;
		return this;
	}

	build(): T {
		if (!this.idSet) {
			throw new Error(
				`${this.kind} is missing id(). Call id('unique-id') before build().`,
			);
		}
		if (!this.nameSet) {
			throw new Error(
				`${this.kind} is missing name(). Call name('Readable name') before build().`,
			);
		}
		return this.config as T;
	}
}

type ActionBuilderConfig = ActionDef;

export class ActionBuilder extends BaseBuilder<ActionBuilderConfig> {
	private readonly effectGroupIds = new Set<string>();

	constructor() {
		super({ effects: [] }, 'Action');
	}

	category(category: ActionCategory) {
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
			throw new Error(
				'Action effect groups can only be used on actions. Use action().effectGroup(...).',
			);
		}
		const built =
			group instanceof ActionEffectGroupBuilder ? group.build() : group;
		if (this.effectGroupIds.has(built.id)) {
			throw new Error(
				`Action effect group id "${built.id}" already exists on this action. Use unique group ids.`,
			);
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

type BuildingEffectKey =
	| 'onBuild'
	| 'onGrowthPhase'
	| 'onUpkeepPhase'
	| 'onPayUpkeepStep'
	| 'onGainIncomeStep'
	| 'onGainAPStep'
	| 'onBeforeAttacked'
	| 'onAttackResolved';

export class BuildingBuilder extends BaseBuilder<BuildingDef> {
	constructor() {
		super(
			{ costs: {} as Record<ResourceKey, number>, onBuild: [] },
			'Building',
		);
		(this.config.costs as Record<ResourceKey, number>)['ap' as ResourceKey] = 1;
	}

	cost(key: ResourceKey, amount: number) {
		this.config.costs[key] = amount;
		return this;
	}

	upkeep(key: ResourceKey, amount: number) {
		this.config.upkeep = this.config.upkeep || {};
		(this.config.upkeep as Record<ResourceKey, number>)[key] = amount;
		return this;
	}

	private pushEffect(key: BuildingEffectKey, effect: EffectConfig) {
		const list = (this.config[key] as EffectConfig[] | undefined) || [];
		list.push(effect);
		this.config[key] = list as BuildingDef[BuildingEffectKey];
		return this;
	}

	onBuild(effect: EffectConfig) {
		return this.pushEffect('onBuild', effect);
	}

	onGrowthPhase(effect: EffectConfig) {
		return this.pushEffect('onGrowthPhase', effect);
	}

	onUpkeepPhase(effect: EffectConfig) {
		return this.pushEffect('onUpkeepPhase', effect);
	}

	onPayUpkeepStep(effect: EffectConfig) {
		return this.pushEffect('onPayUpkeepStep', effect);
	}

	onGainIncomeStep(effect: EffectConfig) {
		return this.pushEffect('onGainIncomeStep', effect);
	}

	onGainAPStep(effect: EffectConfig) {
		return this.pushEffect('onGainAPStep', effect);
	}

	onBeforeAttacked(effect: EffectConfig) {
		return this.pushEffect('onBeforeAttacked', effect);
	}

	onAttackResolved(effect: EffectConfig) {
		return this.pushEffect('onAttackResolved', effect);
	}

	focus(focus: Focus) {
		this.config.focus = focus;
		return this;
	}
}

type DevelopmentEffectKey =
	| 'onBuild'
	| 'onGrowthPhase'
	| 'onPayUpkeepStep'
	| 'onGainIncomeStep'
	| 'onGainAPStep'
	| 'onBeforeAttacked'
	| 'onAttackResolved';

export class DevelopmentBuilder extends BaseBuilder<DevelopmentDef> {
	constructor() {
		super({}, 'Development');
	}

	upkeep(key: ResourceKey, amount: number) {
		this.config.upkeep = this.config.upkeep || {};
		(this.config.upkeep as Record<ResourceKey, number>)[key] = amount;
		return this;
	}

	populationCap(amount: number) {
		this.config.populationCap = amount;
		return this;
	}

	private pushEffect(key: DevelopmentEffectKey, effect: EffectConfig) {
		const list = (this.config[key] as EffectConfig[] | undefined) || [];
		list.push(effect);
		this.config[key] = list as DevelopmentDef[DevelopmentEffectKey];
		return this;
	}

	onBuild(effect: EffectConfig) {
		return this.pushEffect('onBuild', effect);
	}

	onGrowthPhase(effect: EffectConfig) {
		return this.pushEffect('onGrowthPhase', effect);
	}

	onPayUpkeepStep(effect: EffectConfig) {
		return this.pushEffect('onPayUpkeepStep', effect);
	}

	onGainIncomeStep(effect: EffectConfig) {
		return this.pushEffect('onGainIncomeStep', effect);
	}

	onGainAPStep(effect: EffectConfig) {
		return this.pushEffect('onGainAPStep', effect);
	}

	onBeforeAttacked(effect: EffectConfig) {
		return this.pushEffect('onBeforeAttacked', effect);
	}

	onAttackResolved(effect: EffectConfig) {
		return this.pushEffect('onAttackResolved', effect);
	}

	system(flag = true) {
		this.config.system = flag;
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
}

type PopulationEffectKey =
	| 'onAssigned'
	| 'onUnassigned'
	| 'onGrowthPhase'
	| 'onUpkeepPhase'
	| 'onPayUpkeepStep'
	| 'onGainIncomeStep'
	| 'onGainAPStep';

export class PopulationBuilder extends BaseBuilder<PopulationConfig> {
	constructor() {
		super({}, 'Population');
	}

	upkeep(key: ResourceKey, amount: number) {
		this.config.upkeep = this.config.upkeep || {};
		(this.config.upkeep as Record<ResourceKey, number>)[key] = amount;
		return this;
	}

	private pushEffect(key: PopulationEffectKey, effect: EffectConfig) {
		const list = (this.config[key] as EffectConfig[] | undefined) || [];
		list.push(effect);
		this.config[key] = list as PopulationConfig[PopulationEffectKey];
		return this;
	}

	onAssigned(effect: EffectConfig) {
		return this.pushEffect('onAssigned', effect);
	}

	onUnassigned(effect: EffectConfig) {
		return this.pushEffect('onUnassigned', effect);
	}

	onGrowthPhase(effect: EffectConfig) {
		return this.pushEffect('onGrowthPhase', effect);
	}

	onUpkeepPhase(effect: EffectConfig) {
		return this.pushEffect('onUpkeepPhase', effect);
	}

	onPayUpkeepStep(effect: EffectConfig) {
		return this.pushEffect('onPayUpkeepStep', effect);
	}

	onGainIncomeStep(effect: EffectConfig) {
		return this.pushEffect('onGainIncomeStep', effect);
	}

	onGainAPStep(effect: EffectConfig) {
		return this.pushEffect('onGainAPStep', effect);
	}
}

export interface InfoDef {
	key: string;
	icon: string;
	label: string;
	description: string;
}

export class InfoBuilder<T extends InfoDef> {
	protected config: T;

	constructor(key: string) {
		this.config = { key, icon: '', label: '', description: '' } as T;
	}

	icon(icon: string) {
		this.config.icon = icon;
		return this;
	}

	label(label: string) {
		this.config.label = label;
		return this;
	}

	description(description: string) {
		this.config.description = description;
		return this;
	}

	build(): T {
		return this.config;
	}
}

export interface ResourceInfo extends InfoDef {
	/**
	 * Arbitrary tags to mark special behaviours or rules for the resource.
	 * These tags are interpreted by the engine or other systems at runtime.
	 */
	tags?: string[];
}

export class ResourceBuilder extends InfoBuilder<ResourceInfo> {
	constructor(key: ResourceKey) {
		super(key);
	}

	tag(tag: string) {
		this.config.tags = [...(this.config.tags || []), tag];
		return this;
	}
}

export interface PopulationRoleInfo extends InfoDef {}

export class PopulationRoleBuilder extends InfoBuilder<PopulationRoleInfo> {
	constructor(key: PopulationRoleId) {
		super(key);
	}
}

export interface StatInfo extends InfoDef {
	displayAsPercent?: boolean;
	addFormat?: {
		prefix?: string;
		percent?: boolean;
	};
	capacity?: boolean;
}

export class StatBuilder extends InfoBuilder<StatInfo> {
	constructor(key: StatKey) {
		super(key);
	}

	displayAsPercent(flag = true) {
		this.config.displayAsPercent = flag;
		return this;
	}

	addFormat(format: { prefix?: string; percent?: boolean }) {
		this.config.addFormat = { ...this.config.addFormat, ...format };
		return this;
	}

	capacity(flag = true) {
		this.config.capacity = flag;
		return this;
	}
}
