import { startConfig, playerStart } from './config/builders';
import { Resource } from './resources';
import { Stat } from './stats';
import { PopulationRole } from './populationRoles';
import { DevelopmentId } from './developments';
import type { StartConfig } from '@kingdom-builder/protocol';

export const GAME_START: StartConfig = startConfig()
	.player(
		playerStart()
			.resources({
				[Resource.gold]: 10,
				[Resource.ap]: 0,
				[Resource.happiness]: 0,
				[Resource.castleHP]: 10,
			})
			.stats({
				[Stat.maxPopulation]: 1,
				[Stat.armyStrength]: 0,
				[Stat.fortificationStrength]: 0,
				[Stat.absorption]: 0,
				[Stat.growth]: 0.25,
				[Stat.warWeariness]: 0,
			})
			.population({
				[PopulationRole.Council]: 1,
				[PopulationRole.Legion]: 0,
				[PopulationRole.Fortifier]: 0,
				[PopulationRole.Citizen]: 0,
			})
			.lands((lands) => {
				const developedLand = lands.land((land) => {
					return land.development(DevelopmentId.Farm);
				});
				return developedLand.land();
			}),
	)
	.winCondition((condition) =>
		condition
			.id('castle-destroyed')
			.resource(Resource.castleHP)
			.comparison('lte')
			.value(0)
			.defeat(),
	)
	.lastPlayerCompensation((player) =>
		player.resources({
			[Resource.ap]: 1,
		}),
	)
	.build();
