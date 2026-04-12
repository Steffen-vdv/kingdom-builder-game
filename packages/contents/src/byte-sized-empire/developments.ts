import { Registry, developmentSchema } from '@kingdom-builder/protocol';
import { Types, ResourceMethods, PassiveMethods, resourceAmountChange } from '@kingdom-builder/contents-sdk';
import { development, effect, passiveParams } from '../infrastructure/builders';
import type { DevelopmentDef } from '../infrastructure/defs';
import { Res, Dev } from './ids';

export function createDevelopmentRegistry() {
	const registry = new Registry<DevelopmentDef>(developmentSchema.passthrough());

	registry.add(
		Dev.farm,
		development()
			.id(Dev.farm)
			.name('Farm')
			.icon('🌾')
			.onGainIncomeStep(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.food, 1)).build())
			.order(1)
			.build(),
	);

	registry.add(
		Dev.mine,
		development()
			.id(Dev.mine)
			.name('Mine')
			.icon('⛏️')
			.onGainIncomeStep(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.materials, 1)).build())
			.onGainIncomeStep(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.gold, 1)).build())
			.order(2)
			.build(),
	);

	registry.add(
		Dev.cottage,
		development()
			.id(Dev.cottage)
			.name('Cottage')
			.icon('🏠')
			.populationCap(1)
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.populationCap, 1)).build())
			.onBuild(
				effect(Types.Passive, PassiveMethods.ADD)
					.params(
						passiveParams()
							.id('cottage_vp')
							.meta({
								source: {
									type: 'development',
									id: Dev.cottage,
									icon: '🏠',
									name: 'Cottage',
								},
							})
							.build(),
					)
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.vp, 1)).build())
					.build(),
			)
			.order(3)
			.build(),
	);

	registry.add(
		Dev.school,
		development()
			.id(Dev.school)
			.name('School')
			.icon('📚')
			.onGainIncomeStep(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.knowledge, 1)).build())
			.order(4)
			.build(),
	);

	registry.add(
		Dev.garden,
		development()
			.id(Dev.garden)
			.name('Garden')
			.icon('🌿')
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.happiness, 1)).build())
			.onBuild(
				effect(Types.Passive, PassiveMethods.ADD)
					.params(
						passiveParams()
							.id('garden_influence_vp')
							.meta({
								source: {
									type: 'development',
									id: Dev.garden,
									icon: '🌿',
									name: 'Garden',
								},
							})
							.build(),
					)
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.influence, 1)).build())
					.build(),
			)
			.order(5)
			.build(),
	);

	registry.add(
		Dev.tradingPost,
		development()
			.id(Dev.tradingPost)
			.name('Trading Post')
			.icon('🏪')
			.onGainIncomeStep(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.gold, 2)).build())
			.order(6)
			.build(),
	);

	return registry;
}
