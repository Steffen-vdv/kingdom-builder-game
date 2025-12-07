import type { Registry } from '@kingdom-builder/protocol';
import type { ActionDef } from '../actions';
import { action, effect } from '../config/builders';
import {
	ResourceMethods,
	Types,
	LandMethods,
	DevelopmentMethods,
} from '../config/builderShared';
import { SystemActionId } from '../actionIds';
import { Resource, Stat, PopulationRole } from '../internal';
import { DevelopmentId } from '../developments';
import { resourceChange } from '../resourceV2';

/**
 * Creates a resource:add effect using the ResourceV2 system.
 * Automatically converts resource/stat/population keys to their V2 IDs.
 */
function resourceAdd(resourceId: string, amount: number) {
	return effect(Types.Resource, ResourceMethods.ADD)
		.params(resourceChange(resourceId).amount(amount).build())
		.build();
}

/**
 * Creates a land:add effect that adds the specified number of lands.
 */
function landAdd(count: number) {
	return effect(Types.Land, LandMethods.ADD)
		.param('count', count)
		.build();
}

/**
 * Creates a development:add effect that adds a development to the most
 * recent land with an open slot.
 */
function developmentAdd(developmentId: string) {
	return effect(Types.Development, DevelopmentMethods.ADD)
		.param('id', developmentId)
		.build();
}

export function registerInitialSetupActions(registry: Registry<ActionDef>) {
	// Normal mode initial setup - applied to each player at game start
	registry.add(
		SystemActionId.initial_setup,
		action()
			.id(SystemActionId.initial_setup)
			.name('Initial Setup')
			.icon('🎮')
			.system()
			.free()
			// Resources
			.effect(resourceAdd(Resource.gold, 10))
			.effect(resourceAdd(Resource.castleHP, 10))
			// Stats (only non-zero values need to be set)
			.effect(resourceAdd(Stat.populationMax, 1))
			.effect(resourceAdd(Stat.growth, 0.25))
			// Population
			.effect(resourceAdd(PopulationRole.Council, 1))
			// Lands: First add one land, then add Farm, then add empty land
			.effect(landAdd(1))
			.effect(developmentAdd(DevelopmentId.Farm))
			.effect(landAdd(1))
			.build(),
	);

	// Dev mode initial setup - applied to each player in dev mode
	registry.add(
		SystemActionId.initial_setup_devmode,
		action()
			.id(SystemActionId.initial_setup_devmode)
			.name('Initial Setup (Dev Mode)')
			.icon('🛠️')
			.system()
			.free()
			// Resources (dev mode gets more resources)
			.effect(resourceAdd(Resource.gold, 100))
			.effect(resourceAdd(Resource.happiness, 10))
			.effect(resourceAdd(Resource.castleHP, 10))
			// Stats (same as normal mode)
			.effect(resourceAdd(Stat.populationMax, 1))
			.effect(resourceAdd(Stat.growth, 0.25))
			// Population (dev mode gets more population)
			.effect(resourceAdd(PopulationRole.Council, 2))
			.effect(resourceAdd(PopulationRole.Legion, 1))
			.effect(resourceAdd(PopulationRole.Fortifier, 1))
			// Lands: 10 total (1 with Farm, 6 with Houses, 3 empty)
			// First land with Farm
			.effect(landAdd(1))
			.effect(developmentAdd(DevelopmentId.Farm))
			// Six lands with Houses (each land gets one House)
			.effect(landAdd(1))
			.effect(developmentAdd(DevelopmentId.House))
			.effect(landAdd(1))
			.effect(developmentAdd(DevelopmentId.House))
			.effect(landAdd(1))
			.effect(developmentAdd(DevelopmentId.House))
			.effect(landAdd(1))
			.effect(developmentAdd(DevelopmentId.House))
			.effect(landAdd(1))
			.effect(developmentAdd(DevelopmentId.House))
			.effect(landAdd(1))
			.effect(developmentAdd(DevelopmentId.House))
			// Three empty lands
			.effect(landAdd(3))
			.build(),
	);

	// Compensation for player B (last player) - applied after initial setup
	registry.add(
		SystemActionId.compensation,
		action()
			.id(SystemActionId.compensation)
			.name('Player Compensation')
			.icon('⚖️')
			.system()
			.free()
			// Extra AP for the second player
			.effect(resourceAdd(Resource.ap, 1))
			.build(),
	);

	// Dev mode compensation for player B - override castleHP to 1
	registry.add(
		SystemActionId.compensation_devmode_b,
		action()
			.id(SystemActionId.compensation_devmode_b)
			.name('Dev Mode Player B Compensation')
			.icon('🔧')
			.system()
			.free()
			// Reduce castle HP to 1 (remove 9 from the initial 10)
			.effect(
				effect(Types.Resource, ResourceMethods.REMOVE)
					.params(resourceChange(Resource.castleHP).amount(9).build())
					.build(),
			)
			.build(),
	);
}
