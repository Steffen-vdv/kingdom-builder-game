import type {
	ResourceV2TierDefinition,
	ResourceV2TierDisplayMetadata,
	ResourceV2TierPassivePreview,
	ResourceV2TierTextTokens,
	ResourceV2TierTrack,
} from '@kingdom-builder/protocol';

import { normalizeEffect, type EffectLike } from './shared';

export class ResourceV2TierDefinitionBuilder {
	private readonly config: Partial<ResourceV2TierDefinition> = {};
	private readonly assigned = new Set<string>();

	constructor(id: string) {
		this.id(id);
	}

	private set<K extends keyof ResourceV2TierDefinition>(
		key: K,
		value: ResourceV2TierDefinition[K],
		message: string,
	) {
		const keyName = String(key);
		if (this.assigned.has(keyName)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(keyName);
		return this;
	}

	id(id: string) {
		return this.set(
			'id',
			id,
			'Tier definition already set id(). Remove the extra id() call.',
		);
	}

	range(min: number, max?: number) {
		if (max !== undefined && max < min) {
			throw new Error('Tier definition range max must be >= min.');
		}
		return this.set(
			'range',
			{ min, max },
			'Tier definition already set range(). Remove the duplicate range() call.',
		);
	}

	enterEffect(effect: EffectLike) {
		const list = (this.config.enterEffects || []).slice();
		list.push(normalizeEffect(effect));
		this.config.enterEffects = list;
		return this;
	}

	exitEffect(effect: EffectLike) {
		const list = (this.config.exitEffects || []).slice();
		list.push(normalizeEffect(effect));
		this.config.exitEffects = list;
		return this;
	}

	passivePreview(preview: ResourceV2TierPassivePreview) {
		return this.set(
			'passivePreview',
			preview,
			'Tier definition already set passivePreview(). Remove the duplicate call.',
		);
	}

	text(tokens: ResourceV2TierTextTokens) {
		return this.set(
			'text',
			tokens,
			'Tier definition already set text(). Remove the duplicate call.',
		);
	}

	display(metadata: ResourceV2TierDisplayMetadata) {
		return this.set(
			'display',
			metadata,
			'Tier definition already set display(). Remove the duplicate call.',
		);
	}

	build(): ResourceV2TierDefinition {
		if (!this.assigned.has('id')) {
			throw new Error(
				"Tier definition is missing id(). Call id('tier-id') before build().",
			);
		}
		if (!this.assigned.has('range')) {
			throw new Error(
				'Tier definition is missing range(). Call range(min, max?) before build().',
			);
		}
		return this.config as ResourceV2TierDefinition;
	}
}

export class ResourceV2TierTrackBuilder {
	private readonly config: Partial<ResourceV2TierTrack> = { tiers: [] };
	private readonly assigned = new Set<string>();
	private readonly tierIds = new Set<string>();

	constructor(id: string) {
		this.id(id);
	}

	private set<K extends keyof ResourceV2TierTrack>(
		key: K,
		value: ResourceV2TierTrack[K],
		message: string,
	) {
		const keyName = String(key);
		if (this.assigned.has(keyName)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(keyName);
		return this;
	}

	id(id: string) {
		return this.set(
			'id',
			id,
			'Tier track already set id(). Remove the extra id() call.',
		);
	}

	title(title: string) {
		return this.set(
			'title',
			title,
			'Tier track already set title(). Remove the duplicate title() call.',
		);
	}

	description(description: string) {
		return this.set(
			'description',
			description,
			'Tier track already set description(). Remove the duplicate call.',
		);
	}

	private ensureRangeOrder(candidate: ResourceV2TierDefinition) {
		const tiers = this.config.tiers || [];
		for (const tier of tiers) {
			const existingMax = tier.range.max ?? Number.POSITIVE_INFINITY;
			const candidateMax = candidate.range.max ?? Number.POSITIVE_INFINITY;
			const overlaps =
				candidate.range.min <= existingMax && tier.range.min <= candidateMax;
			if (overlaps) {
				throw new Error(
					`Tier ranges for track "${this.config.id}" overlap. ` +
						'Adjust min/max so tiers are disjoint.',
				);
			}
		}
	}

	tier(tier: ResourceV2TierDefinition | ResourceV2TierDefinitionBuilder) {
		const definition =
			tier instanceof ResourceV2TierDefinitionBuilder ? tier.build() : tier;
		if (this.tierIds.has(definition.id)) {
			throw new Error(
				`Tier track already contains tier "${definition.id}". Remove the duplicate tier() call.`,
			);
		}
		this.ensureRangeOrder(definition);
		const tiers = this.config.tiers || [];
		tiers.push(definition);
		tiers.sort((a, b) => a.range.min - b.range.min);
		this.config.tiers = tiers;
		this.tierIds.add(definition.id);
		return this;
	}

	build(): ResourceV2TierTrack {
		if (!this.assigned.has('id')) {
			throw new Error(
				"Tier track is missing id(). Call id('track-id') before build().",
			);
		}
		const tiers = this.config.tiers || [];
		if (tiers.length === 0) {
			throw new Error(
				'Tier track must define at least one tier() before build().',
			);
		}
		this.config.tiers = tiers;
		return this.config as ResourceV2TierTrack;
	}
}
