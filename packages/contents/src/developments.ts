import { Registry, developmentSchema } from '@kingdom-builder/protocol';
import { Stat } from './stats';
import { Resource } from './resources';
import { development, developmentParams, developmentEvaluator, effect, resourceParams, resourceV2Add, statParams } from './config/builders';
import { Types, StatMethods, DevelopmentMethods, ResourceMethods } from './config/builderShared';
import { ResourceV2Id } from './resourceV2';
import { Focus } from './defs';
import type { DevelopmentDef } from './defs';

export type { DevelopmentDef } from './defs';

export const DevelopmentId = {
	Farm: 'farm',
	House: 'house',
	Outpost: 'outpost',
	Watchtower: 'watchtower',
	Garden: 'garden',
} as const;
export type DevelopmentId = (typeof DevelopmentId)[keyof typeof DevelopmentId];

export function createDevelopmentRegistry() {
	const registry = new Registry<DevelopmentDef>(developmentSchema.passthrough());

	registry.add(
		DevelopmentId.Farm,
		development()
			.id(DevelopmentId.Farm)
			.name('Farm')
			.icon('🌾')
			.onGainIncomeStep(
				effect()
					.evaluator(developmentEvaluator().id('$id'))
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceParams().key(Resource.gold).amount(2)).build())
					.build(),
			)
			.order(2)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		DevelopmentId.House,
		development()
			.id(DevelopmentId.House)
			.name('House')
			.icon('🏠')
			.populationCap(1)
			.onBuild(effect(Types.Stat, StatMethods.ADD).params(statParams().key(Stat.maxPopulation).amount(1)).build())
			.order(1)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		DevelopmentId.Outpost,
		development()
			.id(DevelopmentId.Outpost)
			.name('Outpost')
			.icon('🏹')
			.onBuild(effect(Types.Stat, StatMethods.ADD).params(statParams().key(Stat.armyStrength).amount(1)).build())
			.onBuild(effect(Types.Stat, StatMethods.ADD).params(statParams().key(Stat.fortificationStrength).amount(1)).build())
			.order(3)
			.focus(Focus.Defense)
			.build(),
	);

	const watchtowerRemovalParams = developmentParams().id(DevelopmentId.Watchtower).landId('$landId');

	registry.add(
		DevelopmentId.Watchtower,
		development()
			.id(DevelopmentId.Watchtower)
			.name('Watchtower')
			.icon('🗼')
			.onBuild(effect(Types.Stat, StatMethods.ADD).params(statParams().key(Stat.fortificationStrength).amount(2)).build())
			.onBuild(resourceV2Add(ResourceV2Id.Absorption).amount(0.5).build())
			.onAttackResolved(effect(Types.Development, DevelopmentMethods.REMOVE).params(watchtowerRemovalParams).build())
			.order(4)
			.focus(Focus.Defense)
			.build(),
	);

	registry.add(DevelopmentId.Garden, development().id(DevelopmentId.Garden).name('Garden').icon('🌿').system().build());

	return registry;
}

export const DEVELOPMENTS = createDevelopmentRegistry();
