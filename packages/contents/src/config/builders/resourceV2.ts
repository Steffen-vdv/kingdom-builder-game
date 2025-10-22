import type {
	EffectConfig,
	ResourceV2BoundsMetadata,
	ResourceV2Definition,
	ResourceV2DisplayMetadata,
	ResourceV2GlobalActionCostMetadata,
	ResourceV2GroupDefinition,
	ResourceV2GroupMembershipDescriptor,
	ResourceV2GroupParentDescriptor,
	ResourceV2TierDefinition,
	ResourceV2TierDisplayMetadata,
	ResourceV2TierRange,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';

import { ResourceMethods, Types } from '../builderShared';
import type { EffectBuilder } from './evaluators';
import { effect } from './evaluators';
import { resolveEffectConfig } from './effectParams/resolveEffectConfig';

type BuilderResult<T> = T | undefined;
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function isBuilder<T>(value: unknown): value is { build(): T } {
	return !!value && typeof (value as { build: unknown }).build === 'function';
}

class DisplayMetadataBuilder {
	private readonly config: Partial<ResourceV2DisplayMetadata> = {};
	private readonly assigned = new Set<keyof ResourceV2DisplayMetadata>();

	name(name: string) {
		return this.set('name', name, 'Resource display already set name(). Remove the extra name() call.');
	}

	icon(icon: string) {
		return this.set('icon', icon, 'Resource display already set icon(). Remove the extra icon() call.');
	}

	description(description: string) {
		return this.set('description', description, 'Resource display already set description(). Remove the extra description() call.');
	}

	order(order: number) {
		return this.set('order', order, 'Resource display already set order(). Remove the extra order() call.');
	}

	displayAsPercent(flag = true) {
		return this.set('displayAsPercent', flag, 'Resource display already set displayAsPercent(). Remove the extra displayAsPercent() call.');
	}

	private set<K extends keyof ResourceV2DisplayMetadata>(key: K, value: ResourceV2DisplayMetadata[K], message: string) {
		if (this.assigned.has(key)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(key);
		return this;
	}

	build(): ResourceV2DisplayMetadata {
		if (!this.assigned.has('name')) {
			throw new Error("Resource display is missing name(). Call name('Readable name') before build().");
		}
		if (!this.assigned.has('order')) {
			throw new Error('Resource display is missing order(). Call order(number) before build().');
		}
		return this.config as ResourceV2DisplayMetadata;
	}
}

class BoundsMetadataBuilder {
	private readonly config: Partial<ResourceV2BoundsMetadata> = {};
	private readonly assigned = new Set<keyof ResourceV2BoundsMetadata>();

	lowerBound(value: number) {
		return this.set('lowerBound', value, 'Bounds already set lowerBound(). Remove the duplicate lowerBound() call.');
	}

	upperBound(value: number) {
		return this.set('upperBound', value, 'Bounds already set upperBound(). Remove the duplicate upperBound() call.');
	}

	private set<K extends keyof ResourceV2BoundsMetadata>(key: K, value: ResourceV2BoundsMetadata[K], message: string) {
		if (this.assigned.has(key)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(key);
		return this;
	}

	build(): BuilderResult<ResourceV2BoundsMetadata> {
		if (this.assigned.size === 0) {
			return undefined;
		}
		return this.config as ResourceV2BoundsMetadata;
	}
}

class TierDisplayBuilder {
	private readonly config: Partial<ResourceV2TierDisplayMetadata> = {};
	private readonly assigned = new Set<keyof ResourceV2TierDisplayMetadata>();

	title(title: string) {
		return this.set('title', title, 'Tier display already set title(). Remove the extra title() call.');
	}

	icon(icon: string) {
		return this.set('icon', icon, 'Tier display already set icon(). Remove the extra icon() call.');
	}

	summary(summary: string) {
		return this.set('summary', summary, 'Tier display already set summary(). Remove the extra summary() call.');
	}

	description(description: string) {
		return this.set('description', description, 'Tier display already set description(). Remove the extra description() call.');
	}

	removalCondition(condition: string) {
		return this.set('removalCondition', condition, 'Tier display already set removalCondition(). Remove the extra removalCondition() call.');
	}

	private set<K extends keyof ResourceV2TierDisplayMetadata>(key: K, value: ResourceV2TierDisplayMetadata[K], message: string) {
		if (this.assigned.has(key)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(key);
		return this;
	}

	build(): BuilderResult<ResourceV2TierDisplayMetadata> {
		if (this.assigned.size === 0) {
			return undefined;
		}
		return this.config as ResourceV2TierDisplayMetadata;
	}
}

export class ResourceV2TierDefinitionBuilder {
	private readonly id: string;
	private readonly tierRange: Partial<Mutable<ResourceV2TierRange>> = {};
	private rangeSet = false;
	private readonly enterEffects: EffectConfig[] = [];
	private readonly exitEffects: EffectConfig[] = [];
	private readonly displayBuilder = new TierDisplayBuilder();

	constructor(id: string) {
		this.id = id;
	}

	range(min: number, max?: number) {
		if (this.rangeSet) {
			throw new Error('Tier definition already set range(). Remove the duplicate range() call.');
		}
		this.tierRange.min = min;
		if (max !== undefined) {
			this.tierRange.max = max;
		}
		this.rangeSet = true;
		return this;
	}

	enter(...effects: Array<EffectConfig | EffectBuilder>) {
		effects.map(resolveEffectConfig).forEach((effectConfig) => this.enterEffects.push(effectConfig));
		return this;
	}

	exit(...effects: Array<EffectConfig | EffectBuilder>) {
		effects.map(resolveEffectConfig).forEach((effectConfig) => this.exitEffects.push(effectConfig));
		return this;
	}

	title(title: string) {
		this.displayBuilder.title(title);
		return this;
	}

	icon(icon: string) {
		this.displayBuilder.icon(icon);
		return this;
	}

	summary(summary: string) {
		this.displayBuilder.summary(summary);
		return this;
	}

	description(description: string) {
		this.displayBuilder.description(description);
		return this;
	}

	removalCondition(condition: string) {
		this.displayBuilder.removalCondition(condition);
		return this;
	}

	build(): ResourceV2TierDefinition {
		if (!this.rangeSet) {
			throw new Error('Tier definition is missing range(). Call range(min, max?) before build().');
		}

		const definition: Mutable<ResourceV2TierDefinition> = {
			id: this.id,
			range: this.tierRange as ResourceV2TierRange,
		};

		if (this.enterEffects.length) {
			definition.enterEffects = [...this.enterEffects];
		}
		if (this.exitEffects.length) {
			definition.exitEffects = [...this.exitEffects];
		}

		const display = this.displayBuilder.build();
		if (display) {
			definition.display = display;
		}

		return definition;
	}
}

export class ResourceV2TierTrackBuilder {
	private readonly id: string;
	private readonly tiers: ResourceV2TierDefinition[] = [];
	private readonly tierIds = new Set<string>();

	constructor(id: string) {
		this.id = id;
	}

	tier(tier: ResourceV2TierDefinition | ResourceV2TierDefinitionBuilder) {
		const resolved = isBuilder<ResourceV2TierDefinition>(tier) ? tier.build() : tier;
		if (this.tierIds.has(resolved.id)) {
			throw new Error(`Tier track already contains tier id "${resolved.id}". Remove the duplicate tier().`);
		}

		const previous = this.tiers[this.tiers.length - 1];
		if (previous && resolved.range.min < previous.range.min) {
			throw new Error('ResourceV2 tier ranges must be added in ascending order. Fix the range(min) values.');
		}

		this.tierIds.add(resolved.id);
		this.tiers.push(resolved);
		return this;
	}

	tierWith(id: string, configure: (builder: ResourceV2TierDefinitionBuilder) => void) {
		const builder = new ResourceV2TierDefinitionBuilder(id);
		configure(builder);
		return this.tier(builder);
	}

	build(): ResourceV2TierTrackDefinition {
		if (!this.tiers.length) {
			throw new Error('ResourceV2 tier track requires at least one tier(). Add tiers before build().');
		}
		const track: Mutable<ResourceV2TierTrackDefinition> = {
			id: this.id,
			tiers: [...this.tiers],
		};
		return track;
	}
}

class GroupParentBuilder {
	private readonly id: string;
	private readonly displayBuilder = new DisplayMetadataBuilder();
	private readonly boundsBuilder = new BoundsMetadataBuilder();
	private tierTrackDefinition?: ResourceV2TierTrackDefinition;
	private hasTierTrack = false;
	private trackValueBreakdownFlag?: boolean;
	private trackBoundBreakdownFlag?: boolean;

	constructor(id: string) {
		this.id = id;
	}

	name(name: string) {
		this.displayBuilder.name(name);
		return this;
	}

	icon(icon: string) {
		this.displayBuilder.icon(icon);
		return this;
	}

	description(description: string) {
		this.displayBuilder.description(description);
		return this;
	}

	order(order: number) {
		this.displayBuilder.order(order);
		return this;
	}

	displayAsPercent(flag = true) {
		this.displayBuilder.displayAsPercent(flag);
		return this;
	}

	lowerBound(value: number) {
		this.boundsBuilder.lowerBound(value);
		return this;
	}

	upperBound(value: number) {
		this.boundsBuilder.upperBound(value);
		return this;
	}

	trackValueBreakdown(flag = true) {
		this.trackValueBreakdownFlag = flag;
		return this;
	}

	trackBoundBreakdown(flag = true) {
		this.trackBoundBreakdownFlag = flag;
		return this;
	}

	tierTrack(track: ResourceV2TierTrackDefinition | ResourceV2TierTrackBuilder) {
		if (this.hasTierTrack) {
			throw new Error('Resource group parent already set tierTrack(). Remove the duplicate tierTrack() call.');
		}
		this.tierTrackDefinition = isBuilder<ResourceV2TierTrackDefinition>(track) ? track.build() : track;
		this.hasTierTrack = true;
		return this;
	}

	build(): ResourceV2GroupParentDescriptor {
		const bounds = this.boundsBuilder.build();
		const descriptor: Mutable<ResourceV2GroupParentDescriptor> = {
			id: this.id,
			display: this.displayBuilder.build(),
			relation: 'sumOfAll',
		};

		if (bounds) {
			descriptor.bounds = bounds;
		}
		if (this.trackValueBreakdownFlag !== undefined) {
			descriptor.trackValueBreakdown = this.trackValueBreakdownFlag;
		}
		if (this.trackBoundBreakdownFlag !== undefined) {
			descriptor.trackBoundBreakdown = this.trackBoundBreakdownFlag;
		}
		if (this.tierTrackDefinition) {
			descriptor.tierTrack = this.tierTrackDefinition;
		}

		return descriptor;
	}
}

export class ResourceV2GroupBuilder {
	private readonly id: string;
	private orderValue?: number;
	private readonly childrenIds = new Set<string>();
	private readonly childList: string[] = [];
	private parentBuilder?: GroupParentBuilder;

	constructor(id: string) {
		this.id = id;
	}

	order(order: number) {
		if (this.orderValue !== undefined) {
			throw new Error('Resource group already set order(). Remove the duplicate order() call.');
		}
		this.orderValue = order;
		return this;
	}

	parent(parent: GroupParentBuilder | ResourceV2GroupParentDescriptor): this;
	parent(id: string, configure: (builder: GroupParentBuilder) => void): this;
	parent(parentOrId: GroupParentBuilder | ResourceV2GroupParentDescriptor | string, configure?: (builder: GroupParentBuilder) => void) {
		if (this.parentBuilder) {
			throw new Error('Resource group already configured parent(). Remove the duplicate parent() call.');
		}

		if (typeof parentOrId === 'string') {
			const builder = new GroupParentBuilder(parentOrId);
			configure?.(builder);
			this.parentBuilder = builder;
		} else if (parentOrId instanceof GroupParentBuilder) {
			this.parentBuilder = parentOrId;
		} else {
			const descriptor: ResourceV2GroupParentDescriptor = parentOrId;
			this.parentBuilder = new GroupParentBuilder(descriptor.id);
			this.parentBuilder.name(descriptor.display.name).order(descriptor.display.order);
			if (descriptor.display.icon) {
				this.parentBuilder.icon(descriptor.display.icon);
			}
			if (descriptor.display.description) {
				this.parentBuilder.description(descriptor.display.description);
			}
			if (descriptor.display.displayAsPercent !== undefined) {
				this.parentBuilder.displayAsPercent(descriptor.display.displayAsPercent);
			}
			if (descriptor.bounds?.lowerBound !== undefined) {
				this.parentBuilder.lowerBound(descriptor.bounds.lowerBound);
			}
			if (descriptor.bounds?.upperBound !== undefined) {
				this.parentBuilder.upperBound(descriptor.bounds.upperBound);
			}
			if (descriptor.trackValueBreakdown !== undefined) {
				this.parentBuilder.trackValueBreakdown(descriptor.trackValueBreakdown);
			}
			if (descriptor.trackBoundBreakdown !== undefined) {
				this.parentBuilder.trackBoundBreakdown(descriptor.trackBoundBreakdown);
			}
			if (descriptor.tierTrack) {
				this.parentBuilder.tierTrack(descriptor.tierTrack);
			}
		}

		return this;
	}

	child(resourceId: string) {
		if (this.childrenIds.has(resourceId)) {
			throw new Error(`Resource group already contains child "${resourceId}". Remove the duplicate child().`);
		}
		this.childrenIds.add(resourceId);
		this.childList.push(resourceId);
		return this;
	}

	children(resourceIds: ReadonlyArray<string>) {
		resourceIds.forEach((id) => this.child(id));
		return this;
	}

	build(): ResourceV2GroupDefinition {
		if (this.orderValue === undefined) {
			throw new Error('Resource group is missing order(). Call order(number) before build().');
		}
		if (!this.parentBuilder) {
			throw new Error('Resource group requires parent(). Provide a parent descriptor before build().');
		}
		if (this.childList.length === 0) {
			throw new Error('Resource group requires at least one child(). Add children before build().');
		}

		const group: Mutable<ResourceV2GroupDefinition> = {
			id: this.id,
			order: this.orderValue,
			parent: this.parentBuilder.build(),
			children: [...this.childList],
		};
		return group;
	}
}

export class ResourceV2DefinitionBuilder {
	private readonly id: string;
	private readonly displayBuilder = new DisplayMetadataBuilder();
	private readonly boundsBuilder = new BoundsMetadataBuilder();
	private trackValueBreakdownFlag?: boolean;
	private trackBoundBreakdownFlag?: boolean;
	private tierTrackDefinition?: ResourceV2TierTrackDefinition;
	private hasTierTrack = false;
	private groupDescriptor?: ResourceV2GroupMembershipDescriptor;
	private groupSet = false;
	private globalActionCostMetadata?: ResourceV2GlobalActionCostMetadata;
	private globalCostSet = false;

	constructor(id: string) {
		this.id = id;
	}

	name(name: string) {
		this.displayBuilder.name(name);
		return this;
	}

	icon(icon: string) {
		this.displayBuilder.icon(icon);
		return this;
	}

	description(description: string) {
		this.displayBuilder.description(description);
		return this;
	}

	order(order: number) {
		this.displayBuilder.order(order);
		return this;
	}

	displayAsPercent(flag = true) {
		this.displayBuilder.displayAsPercent(flag);
		return this;
	}

	lowerBound(value: number) {
		this.boundsBuilder.lowerBound(value);
		return this;
	}

	upperBound(value: number) {
		this.boundsBuilder.upperBound(value);
		return this;
	}

	trackValueBreakdown(flag = true) {
		this.trackValueBreakdownFlag = flag;
		return this;
	}

	trackBoundBreakdown(flag = true) {
		this.trackBoundBreakdownFlag = flag;
		return this;
	}

	tierTrack(track: ResourceV2TierTrackDefinition | ResourceV2TierTrackBuilder) {
		if (this.hasTierTrack) {
			throw new Error('Resource already configured tierTrack(). Remove the duplicate tierTrack() call.');
		}
		this.tierTrackDefinition = isBuilder<ResourceV2TierTrackDefinition>(track) ? track.build() : track;
		this.hasTierTrack = true;
		return this;
	}

	group(groupId: string, order: number) {
		if (this.groupSet) {
			throw new Error('Resource already configured group(). Remove the duplicate group() call.');
		}
		this.groupDescriptor = { groupId, order };
		this.groupSet = true;
		return this;
	}

	globalActionCost(amount: number) {
		if (this.globalCostSet) {
			throw new Error('Resource already configured globalActionCost(). Remove the duplicate call.');
		}
		this.globalActionCostMetadata = { amount };
		this.globalCostSet = true;
		return this;
	}

	build(): ResourceV2Definition {
		const display = this.displayBuilder.build();
		const bounds = this.boundsBuilder.build();

		const definition: Mutable<ResourceV2Definition> = {
			id: this.id,
			display,
		};

		if (bounds) {
			definition.bounds = bounds;
		}
		if (this.trackValueBreakdownFlag !== undefined) {
			definition.trackValueBreakdown = this.trackValueBreakdownFlag;
		}
		if (this.trackBoundBreakdownFlag !== undefined) {
			definition.trackBoundBreakdown = this.trackBoundBreakdownFlag;
		}
		if (this.tierTrackDefinition) {
			definition.tierTrack = this.tierTrackDefinition;
		}
		if (this.groupDescriptor) {
			definition.group = this.groupDescriptor;
		}
		if (this.globalActionCostMetadata) {
			definition.globalActionCost = this.globalActionCostMetadata;
		}

		return definition;
	}
}

type ResourceV2ReconciliationMode = 'clamp';

interface ResourceV2EffectMeta extends Record<string, unknown> {
	reconciliation: ResourceV2ReconciliationMode;
	suppressHooks?: { reason: string };
	usesPercent?: true;
}

export class ResourceV2ValueChangeBuilder {
	private readonly effectBuilder: EffectBuilder;
	private readonly meta: ResourceV2EffectMeta = { reconciliation: 'clamp' };
	private amountSet = false;
	private percentSet = false;

	constructor(method: (typeof ResourceMethods)[keyof typeof ResourceMethods], resourceId: string) {
		this.effectBuilder = effect(Types.Resource, method).param('id', resourceId);
	}

	amount(amount: number) {
		if (this.percentSet) {
			throw new Error('ResourceV2 change cannot mix amount() with percent(). Choose one approach.');
		}
		if (this.amountSet) {
			throw new Error('ResourceV2 change already set amount(). Remove the duplicate amount() call.');
		}
		this.effectBuilder.param('amount', amount);
		this.amountSet = true;
		return this;
	}

	percent(percent: number, rounding: 'up' | 'down') {
		if (this.amountSet) {
			throw new Error('ResourceV2 change cannot mix amount() with percent(). Choose one approach.');
		}
		if (this.percentSet) {
			throw new Error('ResourceV2 change already set percent(). Remove the duplicate percent() call.');
		}
		this.effectBuilder.param('percent', percent);
		this.effectBuilder.round(rounding);
		this.meta.usesPercent = true;
		this.percentSet = true;
		return this;
	}

	suppressHooks(reason: string) {
		if (!reason.trim()) {
			throw new Error('ResourceV2 change suppressHooks(...) requires a non-empty justification.');
		}
		this.meta.suppressHooks = { reason };
		return this;
	}

	reconciliation(mode: ResourceV2ReconciliationMode) {
		if (mode !== 'clamp') {
			throw new Error('ResourceV2 change builder only supports clamp reconciliation during MVP.');
		}
		return this;
	}

	build(): EffectConfig {
		if (!this.amountSet && !this.percentSet) {
			throw new Error('ResourceV2 change requires amount() or percent(). Set one before build().');
		}
		this.effectBuilder.meta(this.meta as Record<string, unknown>);
		return this.effectBuilder.build();
	}
}

export function resourceV2Definition(id: string) {
	return new ResourceV2DefinitionBuilder(id);
}

export function resourceV2Group(id: string) {
	return new ResourceV2GroupBuilder(id);
}

export function resourceV2GroupParent(id: string) {
	return new GroupParentBuilder(id);
}

export function resourceV2Tier(id: string) {
	return new ResourceV2TierDefinitionBuilder(id);
}

export function resourceV2TierTrack(id: string) {
	return new ResourceV2TierTrackBuilder(id);
}

export function resourceV2Add(resourceId: string) {
	return new ResourceV2ValueChangeBuilder(ResourceMethods.ADD, resourceId);
}

export function resourceV2Remove(resourceId: string) {
	return new ResourceV2ValueChangeBuilder(ResourceMethods.REMOVE, resourceId);
}
