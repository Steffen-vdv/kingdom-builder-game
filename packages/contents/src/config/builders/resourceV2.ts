import type {
	EffectDef,
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

import { EffectBuilder } from './evaluators';

type ResourceV2EffectOptions = {
	readonly suppressHooks?: boolean;
};

type ResourceV2EffectMeta = {
	readonly reconciliation: 'clamp';
	readonly suppressHooks?: boolean;
};

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function ensureInteger(value: number, message: string) {
	if (!Number.isInteger(value)) {
		throw new Error(message);
	}
}

function applyResourceV2Meta(effect: EffectDef, options?: ResourceV2EffectOptions): EffectDef {
	const meta = effect.meta ? { ...effect.meta } : {};
	const existing = meta.resourceV2 as Partial<ResourceV2EffectMeta> | undefined;
	const resourceMeta: ResourceV2EffectMeta = {
		...(existing ?? {}),
		reconciliation: 'clamp',
		...(options?.suppressHooks ? { suppressHooks: true } : {}),
	};
	return {
		...effect,
		meta: {
			...meta,
			resourceV2: resourceMeta,
		},
	};
}

function resolveEffect(effect: EffectBuilder | EffectDef, options?: ResourceV2EffectOptions) {
	const built = effect instanceof EffectBuilder ? effect.build() : effect;
	return applyResourceV2Meta(built, options);
}

class DisplayBuilder {
	private readonly kind: string;
	private readonly assigned = new Set<keyof ResourceV2DisplayMetadata>();
	private readonly config: Partial<ResourceV2DisplayMetadata> = {};

	constructor(kind: string) {
		this.kind = kind;
	}

	private set<K extends keyof ResourceV2DisplayMetadata>(key: K, value: ResourceV2DisplayMetadata[K], message: string) {
		if (this.assigned.has(key)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(key);
		return this;
	}

	name(name: string) {
		return this.set('name', name, `${this.kind} already set name(). Remove the extra name() call.`);
	}

	icon(icon: string) {
		return this.set('icon', icon, `${this.kind} already set icon(). Remove the extra icon() call.`);
	}

	description(description: string) {
		return this.set('description', description, `${this.kind} already set description(). Remove the duplicate description() call.`);
	}

	order(order: number) {
		ensureInteger(order, `${this.kind} order(...) requires an integer.`);
		return this.set('order', order, `${this.kind} already set order(). Remove the extra order() call.`);
	}

	displayAsPercent(flag = true) {
		return this.set('displayAsPercent', flag, `${this.kind} already set displayAsPercent(). Remove the extra displayAsPercent() call.`);
	}

	build(): ResourceV2DisplayMetadata {
		if (!this.assigned.has('name')) {
			throw new Error(`${this.kind} is missing name(). Call name('Readable name') before build().`);
		}
		if (!this.assigned.has('order')) {
			throw new Error(`${this.kind} is missing order(). Call order(#) before build().`);
		}
		return this.config as ResourceV2DisplayMetadata;
	}
}

class BoundsBuilder {
	private readonly assigned = new Set<keyof ResourceV2BoundsMetadata>();
	private readonly config: Mutable<ResourceV2BoundsMetadata> = {};

	lowerBound(value: number) {
		ensureInteger(value, 'Bounds lowerBound(...) requires an integer value.');
		if (this.assigned.has('lowerBound')) {
			throw new Error('Bounds already set lowerBound(). Remove the extra lowerBound() call.');
		}
		this.config.lowerBound = value;
		this.assigned.add('lowerBound');
		return this;
	}

	upperBound(value: number) {
		ensureInteger(value, 'Bounds upperBound(...) requires an integer value.');
		if (this.assigned.has('upperBound')) {
			throw new Error('Bounds already set upperBound(). Remove the extra upperBound() call.');
		}
		this.config.upperBound = value;
		this.assigned.add('upperBound');
		return this;
	}

	build(): ResourceV2BoundsMetadata | undefined {
		if (this.assigned.size === 0) {
			return undefined;
		}
		const { lowerBound, upperBound } = this.config;
		if (lowerBound !== undefined && upperBound !== undefined && lowerBound > upperBound) {
			throw new Error('Bounds lowerBound cannot exceed upperBound(). Fix the configuration before build().');
		}
		const result: Mutable<ResourceV2BoundsMetadata> = {};
		if (lowerBound !== undefined) {
			result.lowerBound = lowerBound;
		}
		if (upperBound !== undefined) {
			result.upperBound = upperBound;
		}
		return result;
	}
}

class TierDisplayBuilder {
	private readonly assigned = new Set<keyof ResourceV2TierDisplayMetadata>();
	private readonly config: Partial<ResourceV2TierDisplayMetadata> = {};

	private set<K extends keyof ResourceV2TierDisplayMetadata>(key: K, value: ResourceV2TierDisplayMetadata[K], message: string) {
		if (this.assigned.has(key)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(key);
		return this;
	}

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

	removalCondition(removalCondition: string) {
		return this.set('removalCondition', removalCondition, 'Tier display already set removalCondition(). Remove the extra call.');
	}

	build(): ResourceV2TierDisplayMetadata | undefined {
		if (this.assigned.size === 0) {
			return undefined;
		}
		return { ...this.config } as ResourceV2TierDisplayMetadata;
	}
}

export class ResourceV2TierBuilder {
	private readonly id: string;
	private tierRange?: ResourceV2TierRange;
	private readonly enterEffects: EffectDef[] = [];
	private readonly exitEffects: EffectDef[] = [];
	private readonly display = new TierDisplayBuilder();

	constructor(id: string) {
		this.id = id;
	}

	range(min: number, max?: number) {
		if (this.tierRange) {
			throw new Error('Tier already set range(). Remove the extra range() call.');
		}
		ensureInteger(min, 'Tier range(min) requires an integer value.');
		const range: Mutable<ResourceV2TierRange> = { min };
		if (max !== undefined) {
			ensureInteger(max, 'Tier range(max) requires an integer value.');
			if (max <= min) {
				throw new Error('Tier range(max) must be greater than min. Adjust the limits.');
			}
			range.max = max;
		}
		this.tierRange = range;
		return this;
	}

	enterEffect(effect: EffectBuilder | EffectDef, options?: ResourceV2EffectOptions) {
		this.enterEffects.push(resolveEffect(effect, options));
		return this;
	}

	exitEffect(effect: EffectBuilder | EffectDef, options?: ResourceV2EffectOptions) {
		this.exitEffects.push(resolveEffect(effect, options));
		return this;
	}

	title(title: string) {
		this.display.title(title);
		return this;
	}

	icon(icon: string) {
		this.display.icon(icon);
		return this;
	}

	summary(summary: string) {
		this.display.summary(summary);
		return this;
	}

	description(description: string) {
		this.display.description(description);
		return this;
	}

	removalCondition(removalCondition: string) {
		this.display.removalCondition(removalCondition);
		return this;
	}

	build(): ResourceV2TierDefinition {
		if (!this.tierRange) {
			throw new Error('Tier is missing range(). Call range(min, max?) before build().');
		}
		const definition: ResourceV2TierDefinition = {
			id: this.id,
			range: { ...this.tierRange },
		};
		if (this.enterEffects.length) {
			definition.enterEffects = [...this.enterEffects];
		}
		if (this.exitEffects.length) {
			definition.exitEffects = [...this.exitEffects];
		}
		const display = this.display.build();
		if (display) {
			definition.display = display;
		}
		return definition;
	}
}

export class ResourceV2TierTrackBuilder {
	private readonly id: string;
	private readonly tiers: ResourceV2TierDefinition[] = [];

	constructor(id: string) {
		this.id = id;
	}

	tier(tier: ResourceV2TierBuilder | ResourceV2TierDefinition) {
		const definition = tier instanceof ResourceV2TierBuilder ? tier.build() : tier;
		this.tiers.push(definition);
		return this;
	}

	build(): ResourceV2TierTrackDefinition {
		if (this.tiers.length === 0) {
			throw new Error('Tier track is missing tiers. Call tier(...) at least once before build().');
		}
		return { id: this.id, tiers: [...this.tiers] };
	}
}

export class ResourceV2GroupParentBuilder {
	private readonly id: string;
	private readonly display = new DisplayBuilder('Group parent');
	private readonly bounds = new BoundsBuilder();
	private trackValueBreakdownFlag?: boolean;
	private trackBoundBreakdownFlag?: boolean;
	private tierTrackDefinition?: ResourceV2TierTrackDefinition;
	private tierTrackAssigned = false;

	constructor(id: string) {
		this.id = id;
	}

	name(name: string) {
		this.display.name(name);
		return this;
	}

	icon(icon: string) {
		this.display.icon(icon);
		return this;
	}

	description(description: string) {
		this.display.description(description);
		return this;
	}

	order(order: number) {
		this.display.order(order);
		return this;
	}

	displayAsPercent(flag = true) {
		this.display.displayAsPercent(flag);
		return this;
	}

	lowerBound(value: number) {
		this.bounds.lowerBound(value);
		return this;
	}

	upperBound(value: number) {
		this.bounds.upperBound(value);
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

	tierTrack(track: ResourceV2TierTrackBuilder | ResourceV2TierTrackDefinition) {
		if (this.tierTrackAssigned) {
			throw new Error('Group parent already set tierTrack(). Remove the extra tierTrack() call.');
		}
		this.tierTrackDefinition = track instanceof ResourceV2TierTrackBuilder ? track.build() : track;
		this.tierTrackAssigned = true;
		return this;
	}

	build(): ResourceV2GroupParentDescriptor {
		const display = this.display.build();
		const descriptor: ResourceV2GroupParentDescriptor = {
			id: this.id,
			display,
			relation: 'sumOfAll',
		};
		const bounds = this.bounds.build();
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
	private parentDescriptor?: ResourceV2GroupParentDescriptor;
	private readonly children: string[] = [];
	private readonly childIds = new Set<string>();

	constructor(id: string) {
		this.id = id;
	}

	order(order: number) {
		ensureInteger(order, 'Group order(...) requires an integer value.');
		if (this.orderValue !== undefined) {
			throw new Error('Group already set order(). Remove the extra order() call.');
		}
		this.orderValue = order;
		return this;
	}

	parent(parent: ResourceV2GroupParentBuilder | ResourceV2GroupParentDescriptor) {
		if (this.parentDescriptor) {
			throw new Error('Group already set parent(). Remove the extra parent() call.');
		}
		this.parentDescriptor = parent instanceof ResourceV2GroupParentBuilder ? parent.build() : parent;
		return this;
	}

	child(resourceId: string) {
		if (this.childIds.has(resourceId)) {
			throw new Error(`Group already includes child("${resourceId}"). Remove the duplicate child() call.`);
		}
		this.children.push(resourceId);
		this.childIds.add(resourceId);
		return this;
	}

	childrenList(resourceIds: ReadonlyArray<string>) {
		resourceIds.forEach((id) => this.child(id));
		return this;
	}

	build(): ResourceV2GroupDefinition {
		if (this.orderValue === undefined) {
			throw new Error('Group is missing order(). Call order(#) before build().');
		}
		if (!this.parentDescriptor) {
			throw new Error('Group is missing parent(). Call parent(...) before build().');
		}
		if (!this.children.length) {
			throw new Error('Group requires at least one child(). Add child(resourceId) before build().');
		}
		return {
			id: this.id,
			order: this.orderValue,
			parent: this.parentDescriptor,
			children: [...this.children],
		};
	}
}

export class ResourceV2DefinitionBuilder {
	private readonly id: string;
	private readonly display = new DisplayBuilder('Resource');
	private readonly bounds = new BoundsBuilder();
	private trackValueBreakdownFlag?: boolean;
	private trackBoundBreakdownFlag?: boolean;
	private tierTrackDefinition?: ResourceV2TierTrackDefinition;
	private tierTrackAssigned = false;
	private groupDescriptor?: ResourceV2GroupMembershipDescriptor;
	private globalCost?: ResourceV2GlobalActionCostMetadata;

	constructor(id: string) {
		this.id = id;
	}

	name(name: string) {
		this.display.name(name);
		return this;
	}

	icon(icon: string) {
		this.display.icon(icon);
		return this;
	}

	description(description: string) {
		this.display.description(description);
		return this;
	}

	order(order: number) {
		this.display.order(order);
		return this;
	}

	displayAsPercent(flag = true) {
		this.display.displayAsPercent(flag);
		return this;
	}

	lowerBound(value: number) {
		this.bounds.lowerBound(value);
		return this;
	}

	upperBound(value: number) {
		this.bounds.upperBound(value);
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

	tierTrack(track: ResourceV2TierTrackBuilder | ResourceV2TierTrackDefinition) {
		if (this.tierTrackAssigned) {
			throw new Error('Resource already set tierTrack(). Remove the extra tierTrack() call.');
		}
		this.tierTrackDefinition = track instanceof ResourceV2TierTrackBuilder ? track.build() : track;
		this.tierTrackAssigned = true;
		return this;
	}

	group(groupId: string, order: number) {
		ensureInteger(order, 'Group membership order(...) requires an integer value.');
		if (this.groupDescriptor) {
			throw new Error('Resource already set group(). Remove the extra group() call.');
		}
		this.groupDescriptor = { groupId, order };
		return this;
	}

	globalActionCost(amount: number) {
		ensureInteger(amount, 'Global action cost amount(...) requires an integer value.');
		if (amount <= 0) {
			throw new Error('Global action cost amount(...) must be greater than zero.');
		}
		if (this.globalCost) {
			throw new Error('Resource already set globalActionCost(). Remove the extra call.');
		}
		this.globalCost = { amount };
		return this;
	}

	build(): ResourceV2Definition {
		const display = this.display.build();
		const definition: ResourceV2Definition = {
			id: this.id,
			display,
		};
		const bounds = this.bounds.build();
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
		if (this.globalCost) {
			definition.globalActionCost = this.globalCost;
		}
		return definition;
	}
}

export function resourceV2Tier(id: string) {
	return new ResourceV2TierBuilder(id);
}

export function resourceV2TierTrack(id: string) {
	return new ResourceV2TierTrackBuilder(id);
}

export function resourceV2GroupParent(id: string) {
	return new ResourceV2GroupParentBuilder(id);
}

export function resourceV2Group(id: string) {
	return new ResourceV2GroupBuilder(id);
}

export function resourceV2Definition(id: string) {
	return new ResourceV2DefinitionBuilder(id);
}

export function resourceV2Effect(effect: EffectBuilder | EffectDef, options?: ResourceV2EffectOptions) {
	return resolveEffect(effect, options);
}
