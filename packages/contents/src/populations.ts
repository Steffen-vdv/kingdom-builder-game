import { Registry, populationSchema } from '@kingdom-builder/protocol';
import { PopulationRole, Resource, Stat } from './internal';
import { population, effect, resourceEvaluator, passiveParams, populationAssignmentPassiveId } from './config/builders';
import { resourceAmountChange } from './helpers/resourceV2Effects';
import { resourceChange } from './resourceV2';
import { Types, ResourceMethods, PassiveMethods } from './config/builderShared';
import type { PopulationDef } from './defs';

export type { PopulationDef } from './defs';

const COUNCIL_AP_GAIN_PARAMS = resourceAmountChange(Resource.ap, 1);

const LEGION_STRENGTH_GAIN_PARAMS = resourceChange(Stat.armyStrength).amount(1).build();

const FORTIFIER_STRENGTH_GAIN_PARAMS = resourceChange(Stat.fortificationStrength).amount(1).build();

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
					.evaluator(resourceEvaluator().param('id', PopulationRole.Council).resourceId(PopulationRole.Council))
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
