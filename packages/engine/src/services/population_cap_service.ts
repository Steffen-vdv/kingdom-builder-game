import type { PlayerState } from '../state';
import type { DevelopmentConfig } from '../config/schema';
import type { Registry } from '../registry';
import type { RuleSet } from './tiered_resource_service';

export class PopulationCapService {
	constructor(
		private rules: RuleSet,
		private developments: Registry<DevelopmentConfig>,
	) {}

	getCap(player: PlayerState): number {
		let cap = this.rules.basePopulationCap;
		for (const land of player.lands) {
			for (const id of land.developments) {
				const definition = this.developments.get(id);
				cap += definition.populationCap ?? 0;
			}
		}
		return cap;
	}
}
