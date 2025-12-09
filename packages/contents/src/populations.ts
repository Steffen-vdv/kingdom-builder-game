import { Registry, populationSchema } from '@kingdom-builder/protocol';
import { PopulationRole, Resource } from './internal';
import { population, effect, resourceEvaluator } from './config/builders';
import { resourceAmountChange } from './helpers/resourceEffects';
import { Types, ResourceMethods } from './config/builderShared';
import type { PopulationDef } from './defs';

export type { PopulationDef } from './defs';

const COUNCIL_AP_GAIN_PARAMS = resourceAmountChange(Resource.ap, 1);

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
			.build(),
	);

	registry.add(
		PopulationRole.Fortifier,
		population()
			.id(PopulationRole.Fortifier)
			.name('Fortifier')
			.icon('🔧')
			.upkeep(Resource.gold, 1)
			.build(),
	);

	return registry;
}

export const POPULATIONS = createPopulationRegistry();
