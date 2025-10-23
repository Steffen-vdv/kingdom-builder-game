import type { ResourceKey } from '../state';
import type {
	HappinessTierDefinition,
	TierDisplayMetadata,
	TierEffect,
	TierPassivePreview,
	TierPassiveTextTokens,
	TierRange,
} from './tiered_resource_types';
import type { RuleSet } from './services_types';
import type {
	ResourceV2RuntimeCatalog,
	ResourceV2RuntimeTierDefinition,
} from '../resourcesV2';

const DEFAULT_TIER_EFFECT: HappinessTierDefinition['effect'] = {
	incomeMultiplier: 1,
};

const cloneRange = (range: TierRange): TierRange => {
	const cloned: TierRange = { min: range.min };
	if (range.max !== undefined) {
		cloned.max = range.max;
	}
	return cloned;
};

const clonePreview = (
	preview: TierPassivePreview | undefined,
): TierPassivePreview | undefined => {
	if (!preview) {
		return undefined;
	}
	const cloned: TierPassivePreview = { id: preview.id };
	if (preview.effects) {
		cloned.effects = preview.effects.map((effect) => structuredClone(effect));
	}
	return cloned;
};

const cloneTextTokens = (
	text: TierPassiveTextTokens | undefined,
): TierPassiveTextTokens | undefined => {
	if (!text) {
		return undefined;
	}
	const cloned: TierPassiveTextTokens = {};
	if (text.summary !== undefined) {
		cloned.summary = text.summary;
	}
	if (text.description !== undefined) {
		cloned.description = text.description;
	}
	if (text.removal !== undefined) {
		cloned.removal = text.removal;
	}
	return cloned;
};

const cloneDisplayMetadata = (
	display: TierDisplayMetadata | undefined,
): TierDisplayMetadata | undefined => {
	if (!display) {
		return undefined;
	}
	const cloned: TierDisplayMetadata = {};
	if (display.icon !== undefined) {
		cloned.icon = display.icon;
	}
	if (display.title !== undefined) {
		cloned.title = display.title;
	}
	if (display.summaryToken !== undefined) {
		cloned.summaryToken = display.summaryToken;
	}
	if (display.removalCondition !== undefined) {
		cloned.removalCondition = display.removalCondition;
	}
	return cloned;
};

const cloneTier = (tier: HappinessTierDefinition): HappinessTierDefinition => {
	const cloned: HappinessTierDefinition = {
		id: tier.id,
		range: cloneRange(tier.range),
		effect: structuredClone(tier.effect),
	};
	if (tier.enterEffects) {
		cloned.enterEffects = tier.enterEffects.map((effect) =>
			structuredClone(effect),
		);
	}
	if (tier.exitEffects) {
		cloned.exitEffects = tier.exitEffects.map((effect) =>
			structuredClone(effect),
		);
	}
	const preview = clonePreview(tier.preview);
	if (preview) {
		cloned.preview = preview;
	}
	const text = cloneTextTokens(tier.text);
	if (text) {
		cloned.text = text;
	}
	const display = cloneDisplayMetadata(tier.display);
	if (display) {
		cloned.display = display;
	}
	return cloned;
};

const toLegacyTierRange = (
	range: ResourceV2RuntimeTierDefinition['range'],
): TierRange => {
	const cloned: TierRange = { min: range.min };
	if (range.max !== undefined) {
		cloned.max = range.max;
	}
	return cloned;
};

const toLegacyPreview = (
	preview: ResourceV2RuntimeTierDefinition['passivePreview'],
): TierPassivePreview | undefined => {
	if (!preview) {
		return undefined;
	}
	const cloned: TierPassivePreview = { id: preview.id };
	if (preview.effects) {
		cloned.effects = preview.effects.map((effect) => structuredClone(effect));
	}
	return cloned;
};

const toLegacyTextTokens = (
	text: ResourceV2RuntimeTierDefinition['text'],
): TierPassiveTextTokens | undefined => {
	if (!text) {
		return undefined;
	}
	const cloned: TierPassiveTextTokens = {};
	if (text.summary !== undefined) {
		cloned.summary = text.summary;
	}
	if (text.description !== undefined) {
		cloned.description = text.description;
	}
	if (text.removal !== undefined) {
		cloned.removal = text.removal;
	}
	return cloned;
};

const toLegacyDisplayMetadata = (
	display: ResourceV2RuntimeTierDefinition['display'],
): TierDisplayMetadata | undefined => {
	if (!display) {
		return undefined;
	}
	const cloned: TierDisplayMetadata = {};
	if (display.icon !== undefined) {
		cloned.icon = display.icon;
	}
	if (display.title !== undefined) {
		cloned.title = display.title;
	}
	if (display.summaryToken !== undefined) {
		cloned.summaryToken = display.summaryToken;
	}
	if (display.removalCondition !== undefined) {
		cloned.removalCondition = display.removalCondition;
	}
	return cloned;
};

const toLegacyTier = (
	tier: ResourceV2RuntimeTierDefinition,
): HappinessTierDefinition => {
	const cloned: HappinessTierDefinition = {
		id: tier.id,
		range: toLegacyTierRange(tier.range),
		effect: structuredClone(DEFAULT_TIER_EFFECT),
	};
	if (tier.enterEffects) {
		cloned.enterEffects = tier.enterEffects.map((effect) =>
			structuredClone(effect),
		);
	}
	if (tier.exitEffects) {
		cloned.exitEffects = tier.exitEffects.map((effect) =>
			structuredClone(effect),
		);
	}
	const preview = toLegacyPreview(tier.passivePreview);
	if (preview) {
		cloned.preview = preview;
	}
	const text = toLegacyTextTokens(tier.text);
	if (text) {
		cloned.text = text;
	}
	const display = toLegacyDisplayMetadata(tier.display);
	if (display) {
		cloned.display = display;
	}
	return cloned;
};

export class TieredResourceService {
	resourceKey: ResourceKey;
	private readonly resourceTierDefinitions = new Map<
		ResourceKey,
		HappinessTierDefinition[]
	>();

	constructor(
		private rules: RuleSet,
		catalog?: ResourceV2RuntimeCatalog,
	) {
		this.resourceKey = rules.tieredResourceKey;
		if (catalog) {
			for (const [id, definition] of Object.entries(catalog.resourcesById)) {
				if (!definition?.tierTrack) {
					continue;
				}
				this.resourceTierDefinitions.set(
					id,
					definition.tierTrack.tiers.map((tier) => toLegacyTier(tier)),
				);
			}
			for (const [parentId, parent] of Object.entries(catalog.parentsById)) {
				if (!parent?.tierTrack) {
					continue;
				}
				this.resourceTierDefinitions.set(
					parentId,
					parent.tierTrack.tiers.map((tier) => toLegacyTier(tier)),
				);
			}
		}
	}

	definition(
		value: number,
		resourceKey: ResourceKey = this.resourceKey,
	): HappinessTierDefinition | undefined {
		const tiers = this.resourceTierDefinitions.get(resourceKey);
		if (tiers) {
			return this.selectTier(value, tiers);
		}
		if (resourceKey !== this.resourceKey) {
			return undefined;
		}
		return this.selectTier(value, this.rules.tierDefinitions);
	}

	tier(
		value: number,
		resourceKey: ResourceKey = this.resourceKey,
	): TierEffect | undefined {
		return this.definition(value, resourceKey)?.effect;
	}

	trackedResourceIds(): ResourceKey[] {
		return Array.from(this.resourceTierDefinitions.keys());
	}

	private selectTier(
		value: number,
		tiers: HappinessTierDefinition[] | undefined,
	): HappinessTierDefinition | undefined {
		if (!tiers || tiers.length === 0) {
			return undefined;
		}
		let match: HappinessTierDefinition | undefined;
		for (const tier of tiers) {
			if (value < tier.range.min) {
				break;
			}
			if (tier.range.max !== undefined && value > tier.range.max) {
				continue;
			}
			match = tier;
		}
		return match ? cloneTier(match) : undefined;
	}
}
