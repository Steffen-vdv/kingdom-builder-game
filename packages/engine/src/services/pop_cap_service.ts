import type { PlayerState } from '../state';
import type { DevelopmentConfig } from '../config/schema';
import type { Registry } from '../registry';
import type { RuleSet } from './services_types';

export class PopCapService {
	constructor(
		private readonly rules: RuleSet,
		private readonly developments: Registry<DevelopmentConfig>,
	) {}

	getCap(player: PlayerState): number {
		let cap = this.rules.basePopulationCap;
		for (const land of player.lands) {
			for (const id of land.developments) {
				const def = this.developments.get(id);
				cap += def.populationCap ?? 0;
			}
		}
		return cap;
	}
}
