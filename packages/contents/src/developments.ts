import { Registry } from '@kingdom-builder/engine/registry';
import { Stat } from './stats';
import { Resource } from './resources';
import { developmentSchema } from '@kingdom-builder/engine/config/schema';
import {
	development,
	effect,
	Types,
	StatMethods,
	DevelopmentMethods,
	ResourceMethods,
	resourceParams,
	statParams,
	developmentParams,
	developmentEvaluator,
} from './config/builders';
import type { DevelopmentDef } from './defs';

export type { DevelopmentDef } from './defs';

export function createDevelopmentRegistry() {
	const registry = new Registry<DevelopmentDef>(
		developmentSchema.passthrough(),
	);

	registry.add('farm', {
		...development()
			.id('farm')
			.name('Farm')
			.icon('🌾')
			.onGainIncomeStep(
				effect()
					.evaluator(developmentEvaluator().id('$id'))
					.effect(
						effect(Types.Resource, ResourceMethods.ADD)
							.params(resourceParams().key(Resource.gold).amount(2))
							.build(),
					)
					.build(),
			)
			.build(),
		order: 2,
		focus: 'economy',
	});

	registry.add('house', {
		...development()
			.id('house')
			.name('House')
			.icon('🏠')
			.populationCap(1)
			.onBuild(
				effect(Types.Stat, StatMethods.ADD)
					.params(statParams().key(Stat.maxPopulation).amount(1))
					.build(),
			)
			.build(),
		order: 1,
		focus: 'economy',
	});

	registry.add('outpost', {
		...development()
			.id('outpost')
			.name('Outpost')
			.icon('🏹')
			.onBuild(
				effect(Types.Stat, StatMethods.ADD)
					.params(statParams().key(Stat.armyStrength).amount(1))
					.build(),
			)
			.onBuild(
				effect(Types.Stat, StatMethods.ADD)
					.params(statParams().key(Stat.fortificationStrength).amount(1))
					.build(),
			)
			.build(),
		order: 3,
		focus: 'defense',
	});

	registry.add('watchtower', {
		...development()
			.id('watchtower')
			.name('Watchtower')
			.icon('🗼')
			.onBuild(
				effect(Types.Stat, StatMethods.ADD)
					.params(statParams().key(Stat.fortificationStrength).amount(2))
					.build(),
			)
			.onBuild(
				effect(Types.Stat, StatMethods.ADD)
					.params(statParams().key(Stat.absorption).amount(0.5))
					.build(),
			)
			.onAttackResolved(
				effect(Types.Development, DevelopmentMethods.REMOVE)
					.params(developmentParams().id('watchtower').landId('$landId'))
					.build(),
			)
			.build(),
		order: 4,
		focus: 'defense',
	});

	registry.add(
		'garden',
		development().id('garden').name('Garden').icon('🌿').system().build(),
	);

	return registry;
}

export const DEVELOPMENTS = createDevelopmentRegistry();
