import type { ResourceKey } from '../state';
import type { RuleSet } from './services_types';
import type {
	HappinessTierDefinition,
	TierEffect,
} from './tiered_resource_types';

export class TieredResourceService {
	readonly resourceKey: ResourceKey;

	constructor(private readonly rules: RuleSet) {
		this.resourceKey = rules.tieredResourceKey;
	}

	definition(value: number): HappinessTierDefinition | undefined {
		let match: HappinessTierDefinition | undefined;
		for (const tier of this.rules.tierDefinitions) {
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

	tier(value: number): TierEffect | undefined {
		return this.definition(value)?.effect;
	}
}
