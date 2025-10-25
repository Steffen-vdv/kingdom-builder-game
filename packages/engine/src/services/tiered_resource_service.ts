import type { PlayerState, ResourceKey } from '../state';
import type {
	HappinessTierDefinition,
	TierEffect,
} from './tiered_resource_types';
import type { RuleSet } from './services_types';

export class TieredResourceService {
	readonly resourceKey: ResourceKey;
	readonly resourceId: string;
	private readonly metadataId: string | undefined;
	private readonly tierDefinitions: readonly HappinessTierDefinition[];
	private readonly tierById: Map<string, HappinessTierDefinition>;

	constructor(rules: RuleSet) {
		this.resourceKey = rules.tieredResourceKey;
		const explicitId = rules.tieredResourceId;
		if (explicitId !== undefined) {
			this.resourceId = explicitId;
		} else {
			this.resourceId = rules.tieredResourceKey;
		}
		this.metadataId = rules.tierTrackMetadata?.id;
		this.tierDefinitions = [...rules.tierDefinitions];
		this.tierById = new Map();
		for (const definition of this.tierDefinitions) {
			this.tierById.set(definition.id, definition);
		}
	}

	matches(identifier: string): boolean {
		if (!identifier) {
			return false;
		}
		if (identifier === this.resourceId || identifier === this.resourceKey) {
			return true;
		}
		return Boolean(this.metadataId && identifier === this.metadataId);
	}

	getLogIdentifier(): string {
		return this.resourceId;
	}

	valueFor(player: PlayerState): number {
		const value = player.resourceValues[this.resourceId];
		if (typeof value === 'number') {
			return value;
		}
		return 0;
	}

	tierIdFor(player: PlayerState): string | null {
		return player.resourceTierIds[this.resourceId] ?? null;
	}

	definitionForTierId(
		tierId: string | null | undefined,
	): HappinessTierDefinition | undefined {
		if (!tierId) {
			return undefined;
		}
		const definition = this.tierById.get(tierId);
		if (definition) {
			return definition;
		}
		return undefined;
	}

	definition(value: number): HappinessTierDefinition | undefined {
		let match: HappinessTierDefinition | undefined;
		for (const tier of this.tierDefinitions) {
			if (value < tier.range.min) {
				break;
			}
			if (tier.range.max !== undefined && value > tier.range.max) {
				continue;
			}
			match = tier;
		}
		return match;
	}

	tierFor(player: PlayerState): HappinessTierDefinition | undefined {
		return (
			this.definitionForTierId(this.tierIdFor(player)) ??
			this.definition(this.valueFor(player))
		);
	}

	tier(value: number): TierEffect | undefined {
		return this.definition(value)?.effect;
	}
}
