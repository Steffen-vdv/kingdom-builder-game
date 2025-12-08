import { Registry, developmentSchema } from '@kingdom-builder/protocol';
import { Stat, getStatResourceId, Resource, getResourceId } from './internal';
import type { StatKey, ResourceKey } from './internal';
import { development, effect, developmentParams, developmentEvaluator } from './config/builders';
import { Types, DevelopmentMethods, ResourceMethods } from './config/builderShared';
import { Focus } from './defs';
import type { DevelopmentDef } from './defs';
import { resourceChange } from './resource';

export type { DevelopmentDef } from './defs';

export const DevelopmentId = {
	Farm: 'farm',
	House: 'house',
	Outpost: 'outpost',
	Watchtower: 'watchtower',
	Garden: 'garden',
} as const;
export type DevelopmentId = (typeof DevelopmentId)[keyof typeof DevelopmentId];

function resourceAmountParams(resource: ResourceKey, amount: number) {
	return {
		...resourceChange(getResourceId(resource)).amount(amount).build(),
		key: resource,
		amount,
	};
}

function statAmountParams(stat: StatKey, amount: number) {
	return {
		...resourceChange(getStatResourceId(stat)).amount(amount).build(),
		key: stat,
		amount,
	};
}

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
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountParams(Resource.gold, 2)).build())
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
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(statAmountParams(Stat.populationMax, 1)).build())
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
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(statAmountParams(Stat.armyStrength, 1)).build())
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(statAmountParams(Stat.fortificationStrength, 1)).build())
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
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(statAmountParams(Stat.fortificationStrength, 2)).build())
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(statAmountParams(Stat.absorption, 0.5)).build())
			.onAttackResolved(effect(Types.Development, DevelopmentMethods.REMOVE).params(watchtowerRemovalParams).build())
			.order(4)
			.focus(Focus.Defense)
			.build(),
	);

	registry.add(DevelopmentId.Garden, development().id(DevelopmentId.Garden).name('Garden').icon('🌿').system().build());

	return registry;
}

export const DEVELOPMENTS = createDevelopmentRegistry();
