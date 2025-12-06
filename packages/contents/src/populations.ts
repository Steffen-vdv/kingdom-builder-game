import { Registry, populationSchema } from '@kingdom-builder/protocol';
import { PopulationRole } from './populationRoles';
import { Resource } from './resourceKeys';
import { Stat } from './stats';
import { population, effect, populationEvaluator, passiveParams, populationAssignmentPassiveId } from './config/builders';
import { resourceAmountChange, statAmountChange } from './helpers/resourceV2Effects';
import { Types, ResourceMethods, PassiveMethods } from './config/builderShared';
import type { PopulationDef } from './defs';

export type { PopulationDef } from './defs';

const COUNCIL_AP_GAIN_PARAMS = resourceAmountChange(Resource.ap, 1);

const LEGION_STRENGTH_GAIN_PARAMS = statAmountChange(Stat.armyStrength, 1);

const FORTIFIER_STRENGTH_GAIN_PARAMS = statAmountChange(Stat.fortificationStrength, 1);

const LEGION_ASSIGNMENT_PASSIVE_PARAMS = passiveParams().id(populationAssignmentPassiveId(PopulationRole.Legion)).build();

const FORTIFIER_ASSIGNMENT_PASSIVE_PARAMS = passiveParams().id(populationAssignmentPassiveId(PopulationRole.Fortifier)).build();

export function createPopulationRegistry() {
	const registry = new Registry<PopulationDef>(populationSchema);

	registry.add(
		PopulationRole.Council,
		population()
			.id(PopulationRole.Council)
			.name('Council')
			.icon('⚖️')
			.upkeep(Resource.gold, 2)
			.onGainAPStep(
				effect()
					.evaluator(populationEvaluator().param('id', PopulationRole.Council).role(PopulationRole.Council))
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(COUNCIL_AP_GAIN_PARAMS).build())
					.build(),
			)
			.build(),
	);

	registry.add(
		PopulationRole.Legion,
		population()
			.id(PopulationRole.Legion)
			.name('Legion')
			.icon('🎖️')
			.upkeep(Resource.gold, 1)
			.onAssigned(
				effect(Types.Passive, PassiveMethods.ADD).params(LEGION_ASSIGNMENT_PASSIVE_PARAMS).effect(effect(Types.Resource, ResourceMethods.ADD).params(LEGION_STRENGTH_GAIN_PARAMS).build()).build(),
			)
			.onUnassigned(effect(Types.Passive, PassiveMethods.REMOVE).params(LEGION_ASSIGNMENT_PASSIVE_PARAMS).build())
			.build(),
	);

	registry.add(
		PopulationRole.Fortifier,
		population()
			.id(PopulationRole.Fortifier)
			.name('Fortifier')
			.icon('🔧')
			.upkeep(Resource.gold, 1)
			.onAssigned(
				effect(Types.Passive, PassiveMethods.ADD)
					.params(FORTIFIER_ASSIGNMENT_PASSIVE_PARAMS)
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(FORTIFIER_STRENGTH_GAIN_PARAMS).build())
					.build(),
			)
			.onUnassigned(effect(Types.Passive, PassiveMethods.REMOVE).params(FORTIFIER_ASSIGNMENT_PASSIVE_PARAMS).build())
			.build(),
	);

	return registry;
}

export const POPULATIONS = createPopulationRegistry();
