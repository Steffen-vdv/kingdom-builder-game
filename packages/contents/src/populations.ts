import { Registry, populationSchema } from '@kingdom-builder/protocol';
import { PopulationRole } from './populationRoles';
import { Resource } from './resources';
import { Stat } from './stats';
import {
	population,
	effect,
	resourceParams,
	statParams,
	populationEvaluator,
	passiveParams,
	populationAssignmentPassiveId,
} from './config/builders';
import {
	Types,
	ResourceMethods,
	PassiveMethods,
	StatMethods,
} from './config/builderShared';
import type { PopulationDef } from './defs';

export type { PopulationDef } from './defs';

const COUNCIL_AP_GAIN_PARAMS = resourceParams()
	.key(Resource.ap)
	.amount(1)
	.build();

const LEGION_STRENGTH_GAIN_PARAMS = statParams()
	.key(Stat.armyStrength)
	.amount(1)
	.build();

const FORTIFIER_STRENGTH_GAIN_PARAMS = statParams()
	.key(Stat.fortificationStrength)
	.amount(1)
	.build();

const LEGION_ASSIGNMENT_PASSIVE_PARAMS = passiveParams()
	.id(populationAssignmentPassiveId(PopulationRole.Legion))
	.build();

const FORTIFIER_ASSIGNMENT_PASSIVE_PARAMS = passiveParams()
	.id(populationAssignmentPassiveId(PopulationRole.Fortifier))
	.build();

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
					.evaluator(
						populationEvaluator()
							.param('id', PopulationRole.Council)
							.role(PopulationRole.Council),
					)
					.effect(
						effect(Types.Resource, ResourceMethods.ADD)
							.params(COUNCIL_AP_GAIN_PARAMS)
							.build(),
					)
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
				effect(Types.Passive, PassiveMethods.ADD)
					.params(LEGION_ASSIGNMENT_PASSIVE_PARAMS)
					.effect(
						effect(Types.Stat, StatMethods.ADD)
							.params(LEGION_STRENGTH_GAIN_PARAMS)
							.build(),
					)
					.build(),
			)
			.onUnassigned(
				effect(Types.Passive, PassiveMethods.REMOVE)
					.params(LEGION_ASSIGNMENT_PASSIVE_PARAMS)
					.build(),
			)
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
					.effect(
						effect(Types.Stat, StatMethods.ADD)
							.params(FORTIFIER_STRENGTH_GAIN_PARAMS)
							.build(),
					)
					.build(),
			)
			.onUnassigned(
				effect(Types.Passive, PassiveMethods.REMOVE)
					.params(FORTIFIER_ASSIGNMENT_PASSIVE_PARAMS)
					.build(),
			)
			.build(),
	);

	registry.add(
		PopulationRole.Citizen,
		population().id(PopulationRole.Citizen).name('Citizen').icon('👤').build(),
	);

	return registry;
}

export const POPULATIONS = createPopulationRegistry();
