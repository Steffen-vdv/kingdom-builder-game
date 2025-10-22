import type { EffectDef, ResourceV2Definition, ResourceV2GroupMetadata, ResourceV2GroupParent, ResourceV2TierDefinition, ResourceV2TierTrack } from '@kingdom-builder/protocol';

import { BaseBuilder } from './domain/baseBuilder';

type Mutable<T> = {
	-readonly [K in keyof T]: T[K];
};

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export class ResourceV2TierBuilder {
	private readonly config: Partial<ResourceV2TierDefinition> = {};
	private idSet = false;
	private rangeSet = false;
	private passivePreviewSet = false;
	private textSet = false;
	private displaySet = false;

	id(id: string) {
		if (this.idSet) {
			throw new Error('ResourceV2Tier already set id(). Remove the extra id() call.');
		}
		this.config.id = id;
		this.idSet = true;
		return this;
	}

	range(min: number, max?: number) {
		if (this.rangeSet) {
			throw new Error('ResourceV2Tier already set range(). Remove the extra range() call.');
		}
		if (max !== undefined && max < min) {
			throw new Error('ResourceV2Tier range() must have max >= min.');
		}
		this.config.range = { min, max };
		this.rangeSet = true;
		return this;
	}

	enterEffect(effect: EffectDef) {
		const list = this.config.enterEffects ?? [];
		list.push(effect);
		this.config.enterEffects = list;
		return this;
	}

	exitEffect(effect: EffectDef) {
		const list = this.config.exitEffects ?? [];
		list.push(effect);
		this.config.exitEffects = list;
		return this;
	}

	passivePreview(preview: ResourceV2TierDefinition['passivePreview']) {
		if (this.passivePreviewSet) {
			throw new Error('ResourceV2Tier already set passivePreview(). Remove the extra passivePreview() call.');
		}
		this.config.passivePreview = clone(preview);
		this.passivePreviewSet = true;
		return this;
	}

	text(tokens: NonNullable<ResourceV2TierDefinition['text']>) {
		if (this.textSet) {
			throw new Error('ResourceV2Tier already set text(). Remove the extra text() call.');
		}
		this.config.text = { ...tokens };
		this.textSet = true;
		return this;
	}

	display(metadata: NonNullable<ResourceV2TierDefinition['display']>) {
		if (this.displaySet) {
			throw new Error('ResourceV2Tier already set display(). Remove the extra display() call.');
		}
		this.config.display = { ...metadata };
		this.displaySet = true;
		return this;
	}

	build(): ResourceV2TierDefinition {
		if (!this.idSet) {
			throw new Error('ResourceV2Tier is missing id(). Call id("unique-tier-id") before build().');
		}
		if (!this.rangeSet) {
			throw new Error('ResourceV2Tier is missing range(). Call range(min, max?) before build().');
		}
		return {
			id: this.config.id!,
			range: this.config.range!,
			enterEffects: this.config.enterEffects,
			exitEffects: this.config.exitEffects,
			passivePreview: this.config.passivePreview,
			text: this.config.text,
			display: this.config.display,
		};
	}
}

export class ResourceV2TierTrackBuilder {
	private readonly config: Partial<ResourceV2TierTrack> = {};
	private readonly tiers: ResourceV2TierDefinition[] = [];
	private idSet = false;
	private titleSet = false;
	private descriptionSet = false;

	id(id: string) {
		if (this.idSet) {
			throw new Error('ResourceV2TierTrack already set id(). Remove the extra id() call.');
		}
		this.config.id = id;
		this.idSet = true;
		return this;
	}

	title(title: string) {
		if (this.titleSet) {
			throw new Error('ResourceV2TierTrack already set title(). Remove the extra title() call.');
		}
		this.config.title = title;
		this.titleSet = true;
		return this;
	}

	description(description: string) {
		if (this.descriptionSet) {
			throw new Error('ResourceV2TierTrack already set description(). Remove the extra description() call.');
		}
		this.config.description = description;
		this.descriptionSet = true;
		return this;
	}

	tier(tier: ResourceV2TierDefinition | ResourceV2TierBuilder | ((builder: ResourceV2TierBuilder) => ResourceV2TierBuilder)) {
		const builtTier = tier instanceof ResourceV2TierBuilder ? tier.build() : typeof tier === 'function' ? tier(new ResourceV2TierBuilder()).build() : clone(tier);
		if (this.tiers.some((existing) => existing.id === builtTier.id)) {
			throw new Error(`ResourceV2TierTrack already contains tier "${builtTier.id}". Ensure each tier id is unique.`);
		}
		this.tiers.push(builtTier);
		return this;
	}

	private validateTierRanges(orderedTiers: ResourceV2TierDefinition[]) {
		let previousMax: number | undefined;
		for (const tier of orderedTiers) {
			const { min, max } = tier.range;
			if (previousMax !== undefined && min <= previousMax) {
				throw new Error(`Tier "${tier.id}" overlaps or is out of order. Ensure tier ranges increase without overlap.`);
			}
			previousMax = max ?? Number.POSITIVE_INFINITY;
			if (previousMax === Number.POSITIVE_INFINITY && tier !== orderedTiers[orderedTiers.length - 1]) {
				throw new Error(`Tier "${tier.id}" has no max and must be the final tier in the track.`);
			}
		}
	}

	build(): ResourceV2TierTrack {
		if (!this.idSet) {
			throw new Error('ResourceV2TierTrack is missing id(). Call id("track-id") before build().');
		}
		if (this.tiers.length === 0) {
			throw new Error('ResourceV2TierTrack must define at least one tier. Call tier(...) before build().');
		}
		const orderedTiers = [...this.tiers].sort((a, b) => a.range.min - b.range.min);
		this.validateTierRanges(orderedTiers);
		return {
			id: this.config.id!,
			title: this.config.title,
			description: this.config.description,
			tiers: orderedTiers.map(clone),
		};
	}
}

class ResourceV2BaseBuilder<T extends ResourceV2Definition | ResourceV2GroupParent> extends BaseBuilder<T> {
	protected orderSet = false;
	private descriptionSet = false;
	private percentSet = false;
	private lowerBoundSet = false;
	private upperBoundSet = false;
	private valueBreakdownSet = false;
	private boundBreakdownSet = false;
	private tierTrackSet = false;
	private metadataSet = false;
	private readonly builderKind: string;

	constructor(kind: string) {
		super(
			{
				order: 0,
			} as Mutable<Omit<T, 'id' | 'name'>>,
			kind,
		);
		this.builderKind = kind;
	}

	description(description: string) {
		if (this.descriptionSet) {
			throw new Error(`${this.builderKind} already set description(). Remove the extra description() call.`);
		}
		this.config.description = description as T['description'];
		this.descriptionSet = true;
		return this;
	}

	order(order: number) {
		if (this.orderSet) {
			throw new Error(`${this.builderKind} already set order(). Remove the extra order() call.`);
		}
		this.config.order = order as T['order'];
		this.orderSet = true;
		return this;
	}

	percent(flag = true) {
		if (this.percentSet) {
			throw new Error(`${this.builderKind} already set percent(). Remove the extra percent() call.`);
		}
		this.config.isPercent = flag as T['isPercent'];
		this.percentSet = true;
		return this;
	}

	lowerBound(value: number) {
		if (this.lowerBoundSet) {
			throw new Error(`${this.builderKind} already set lowerBound(). Remove the extra lowerBound() call.`);
		}
		this.config.lowerBound = value as T['lowerBound'];
		this.lowerBoundSet = true;
		return this;
	}

	upperBound(value: number) {
		if (this.upperBoundSet) {
			throw new Error(`${this.builderKind} already set upperBound(). Remove the extra upperBound() call.`);
		}
		this.config.upperBound = value as T['upperBound'];
		this.upperBoundSet = true;
		return this;
	}

	bounds(bounds: { lower?: number; upper?: number }) {
		const { lower, upper } = bounds;
		if (lower === undefined && upper === undefined) {
			throw new Error('bounds() requires at least lower or upper to be provided.');
		}
		if (lower !== undefined) {
			this.lowerBound(lower);
		}
		if (upper !== undefined) {
			this.upperBound(upper);
		}
		return this;
	}

	trackValueBreakdown(flag = true) {
		if (this.valueBreakdownSet) {
			throw new Error(`${this.builderKind} already set trackValueBreakdown(). Remove the extra trackValueBreakdown() call.`);
		}
		this.config.trackValueBreakdown = flag as T['trackValueBreakdown'];
		this.valueBreakdownSet = true;
		return this;
	}

	trackBoundBreakdown(flag = true) {
		if (this.boundBreakdownSet) {
			throw new Error(`${this.builderKind} already set trackBoundBreakdown(). Remove the extra trackBoundBreakdown() call.`);
		}
		this.config.trackBoundBreakdown = flag as T['trackBoundBreakdown'];
		this.boundBreakdownSet = true;
		return this;
	}

	tierTrack(track: ResourceV2TierTrack | ResourceV2TierTrackBuilder | ((builder: ResourceV2TierTrackBuilder) => ResourceV2TierTrackBuilder)) {
		if (this.tierTrackSet) {
			throw new Error(`${this.builderKind} already set tierTrack(). Remove the extra tierTrack() call.`);
		}
		const builtTrack = track instanceof ResourceV2TierTrackBuilder ? track.build() : typeof track === 'function' ? track(new ResourceV2TierTrackBuilder()).build() : clone(track);
		this.config.tierTrack = builtTrack as T['tierTrack'];
		this.tierTrackSet = true;
		return this;
	}

	metadata(metadata: NonNullable<T['metadata']>) {
		if (this.metadataSet) {
			throw new Error(`${this.builderKind} already set metadata(). Remove the extra metadata() call.`);
		}
		this.config.metadata = { ...metadata } as T['metadata'];
		this.metadataSet = true;
		return this;
	}

	override build(): T {
		if (!this.orderSet) {
			throw new Error(`${this.builderKind} is missing order(). Call order(index) before build().`);
		}
		if (this.lowerBoundSet && this.upperBoundSet) {
			const lower = this.config.lowerBound as number;
			const upper = this.config.upperBound as number;
			if (upper < lower) {
				throw new Error('upperBound must be greater than or equal to lowerBound.');
			}
		}
		return super.build();
	}
}

export class ResourceV2Builder extends ResourceV2BaseBuilder<ResourceV2Definition> {
	private groupSet = false;
	private globalActionCostSet = false;
	private limitedSet = false;

	constructor() {
		super('ResourceV2');
	}

	groupId(id: string) {
		if (this.groupSet) {
			throw new Error('ResourceV2 already set groupId(). Remove the extra groupId() call.');
		}
		this.config.groupId = id;
		this.groupSet = true;
		return this;
	}

	globalActionCost(amount: number) {
		if (this.globalActionCostSet) {
			throw new Error('ResourceV2 already set globalActionCost(). Remove the extra globalActionCost() call.');
		}
		if (amount < 0) {
			throw new Error('globalActionCost() requires a non-negative integer amount.');
		}
		this.config.globalActionCost = { amount };
		this.globalActionCostSet = true;
		return this;
	}

	limited(flag = true) {
		if (this.limitedSet) {
			throw new Error('ResourceV2 already set limited(). Remove the extra limited() call.');
		}
		this.config.limited = flag;
		this.limitedSet = true;
		return this;
	}
}

export class ResourceV2GroupParentBuilder extends ResourceV2BaseBuilder<ResourceV2GroupParent> {
	constructor() {
		super('ResourceV2GroupParent');
		this.config.relation = 'sumOfAll';
	}

	limited() {
		throw new Error('Group parents are always limited and cannot override limited().');
	}

	override build(): ResourceV2GroupParent {
		this.config.limited = true;
		return {
			...super.build(),
			relation: 'sumOfAll',
			limited: true,
		} as ResourceV2GroupParent;
	}
}

export class ResourceV2GroupBuilder {
	private readonly config: Partial<ResourceV2GroupMetadata> = {};
	private idSet = false;
	private nameSet = false;
	private iconSet = false;
	private descriptionSet = false;
	private orderSet = false;
	private readonly childList: string[] = [];
	private readonly childIds = new Set<string>();
	private metadataSet = false;
	private parentSet = false;

	id(id: string) {
		if (this.idSet) {
			throw new Error('ResourceGroup already set id(). Remove the extra id() call.');
		}
		this.config.id = id;
		this.idSet = true;
		return this;
	}

	name(name: string) {
		if (this.nameSet) {
			throw new Error('ResourceGroup already set name(). Remove the extra name() call.');
		}
		this.config.name = name;
		this.nameSet = true;
		return this;
	}

	icon(icon: string) {
		if (this.iconSet) {
			throw new Error('ResourceGroup already set icon(). Remove the extra icon() call.');
		}
		this.config.icon = icon;
		this.iconSet = true;
		return this;
	}

	description(description: string) {
		if (this.descriptionSet) {
			throw new Error('ResourceGroup already set description(). Remove the extra description() call.');
		}
		this.config.description = description;
		this.descriptionSet = true;
		return this;
	}

	order(order: number) {
		if (this.orderSet) {
			throw new Error('ResourceGroup already set order(). Remove the extra order() call.');
		}
		this.config.order = order;
		this.orderSet = true;
		return this;
	}

	child(resourceId: string) {
		if (this.childIds.has(resourceId)) {
			throw new Error(`ResourceGroup already includes child "${resourceId}". Remove the duplicate child() call.`);
		}
		this.childIds.add(resourceId);
		this.childList.push(resourceId);
		return this;
	}

	children(ids: string[]) {
		ids.forEach((id) => this.child(id));
		return this;
	}

	parent(parent: ResourceV2GroupParent | ResourceV2GroupParentBuilder | ((builder: ResourceV2GroupParentBuilder) => ResourceV2GroupParentBuilder)) {
		if (this.parentSet) {
			throw new Error('ResourceGroup already set parent(). Remove the extra parent() call.');
		}
		const builtParent = parent instanceof ResourceV2GroupParentBuilder ? parent.build() : typeof parent === 'function' ? parent(new ResourceV2GroupParentBuilder()).build() : clone(parent);
		this.config.parent = builtParent;
		this.parentSet = true;
		return this;
	}

	metadata(metadata: NonNullable<ResourceV2GroupMetadata['metadata']>) {
		if (this.metadataSet) {
			throw new Error('ResourceGroup already set metadata(). Remove the extra metadata() call.');
		}
		this.config.metadata = { ...metadata };
		this.metadataSet = true;
		return this;
	}

	build(): ResourceV2GroupMetadata {
		if (!this.idSet) {
			throw new Error('ResourceGroup is missing id(). Call id("group-id") before build().');
		}
		if (!this.nameSet) {
			throw new Error('ResourceGroup is missing name(). Call name("Readable name") before build().');
		}
		if (!this.orderSet) {
			throw new Error('ResourceGroup is missing order(). Call order(index) before build().');
		}
		if (this.childList.length === 0) {
			throw new Error('ResourceGroup requires at least one child(). Call child(id) before build().');
		}
		if (!this.parentSet) {
			throw new Error('ResourceGroup requires parent(). Call parent(...) before build().');
		}
		return {
			id: this.config.id!,
			name: this.config.name!,
			icon: this.config.icon,
			description: this.config.description,
			order: this.config.order!,
			parent: this.config.parent!,
			children: [...this.childList],
			metadata: this.config.metadata,
		};
	}
}

export function resourceV2() {
	return new ResourceV2Builder();
}

export function resourceGroup() {
	return new ResourceV2GroupBuilder();
}

export function resourceTierTrack() {
	return new ResourceV2TierTrackBuilder();
}

export function resourceTier() {
	return new ResourceV2TierBuilder();
}

export function resourceGroupParent() {
	return new ResourceV2GroupParentBuilder();
}
