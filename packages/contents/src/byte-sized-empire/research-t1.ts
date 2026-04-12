/**
 * Byte-Sized Empire — Tier 1 Research Definitions
 *
 * Each T1 tech costs 3-5 Knowledge, has a single tier,
 * and increments Res.t1Done on completion.
 */
import type { ActionConfig, EffectConfig } from '@kingdom-builder/protocol';
import { Types, ResourceMethods, PassiveMethods, ActionMethods, CostModMethods, ResultModMethods, resourceAmountChange } from '@kingdom-builder/contents-sdk';
import { action, effect, passiveParams, costModParams, resultModParams, developmentTarget, actionParams } from '../infrastructure/builders';
import { Res, MetaCat, Dev, Act } from './ids';
import { ResearchT1 } from './researchIds';

type Entry = { id: string; def: ActionConfig };

const t1Done: EffectConfig = effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.t1Done, 1)).build();

function res(resId: string, amount: number): EffectConfig {
	return effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(resId, amount)).build();
}

function resPassive(id: string, ...resources: [string, number][]): EffectConfig {
	const builder = effect(Types.Passive, PassiveMethods.ADD).params(passiveParams().id(id));
	for (const [resId, amount] of resources) {
		builder.effect(res(resId, amount));
	}
	return builder.build();
}

function devResultMod(id: string, devId: string, amount: number): EffectConfig {
	return effect(Types.ResultMod, ResultModMethods.ADD)
		.params(resultModParams().id(id).evaluation(developmentTarget().id(devId)).amount(amount))
		.build();
}

function costMod(id: string, resId: string, amount: number): EffectConfig {
	return effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id(id).resourceId(resId).amount(amount)).build();
}

function unlock(actionId: string): EffectConfig {
	return effect(Types.Action, ActionMethods.ADD).params(actionParams().id(actionId)).build();
}

export function t1Research(): Entry[] {
	return [
		{
			id: ResearchT1.agriculture,
			def: action()
				.id(ResearchT1.agriculture)
				.metaCategory(MetaCat.research)
				.name('Agriculture')
				.icon('🌱')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 4)
						.effect(devResultMod('bse_agriculture', Dev.farm, 1))
						.effect(t1Done),
				)
				.build(),
		},
		{
			id: ResearchT1.masonry,
			def: action()
				.id(ResearchT1.masonry)
				.metaCategory(MetaCat.research)
				.name('Masonry')
				.icon('🧱')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 3)
						.effect(devResultMod('bse_masonry_mine', Dev.mine, 1))
						.effect(costMod('bse_masonry_build', Res.materials, -1))
						.effect(t1Done),
				)
				.build(),
		},
		{
			id: ResearchT1.commerce,
			def: action()
				.id(ResearchT1.commerce)
				.metaCategory(MetaCat.research)
				.name('Commerce')
				.icon('🪙')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 4)
						.effect(unlock(Act.developTradingPost))
						.effect(resPassive('bse_commerce', [Res.gold, 1]))
						.effect(t1Done),
				)
				.build(),
		},
		{
			id: ResearchT1.writing,
			def: action()
				.id(ResearchT1.writing)
				.metaCategory(MetaCat.research)
				.name('Writing')
				.icon('📜')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 4)
						.effect(unlock(Act.developSchool))
						.effect(resPassive('bse_writing', [Res.knowledge, 1]))
						.effect(t1Done),
				)
				.build(),
		},
		{
			id: ResearchT1.mysticism,
			def: action()
				.id(ResearchT1.mysticism)
				.metaCategory(MetaCat.research)
				.name('Mysticism')
				.icon('🔮')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 4)
						.effect(unlock(Act.developGarden))
						.effect(resPassive('bse_mysticism', [Res.influence, 1], [Res.happiness, 1]))
						.effect(t1Done),
				)
				.build(),
		},
		{
			id: ResearchT1.warfare,
			def: action()
				.id(ResearchT1.warfare)
				.metaCategory(MetaCat.research)
				.name('Warfare')
				.icon('⚔️')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 3)
						.effect(resPassive('bse_warfare', [Res.defense, 2]))
						.effect(t1Done),
				)
				.build(),
		},
		{
			id: ResearchT1.animalHusbandry,
			def: action()
				.id(ResearchT1.animalHusbandry)
				.metaCategory(MetaCat.research)
				.name('Animal Husbandry')
				.icon('🐄')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 3)
						.effect(devResultMod('bse_animal_husbandry', Dev.farm, 1))
						.effect(t1Done),
				)
				.build(),
		},
		{
			id: ResearchT1.pottery,
			def: action()
				.id(ResearchT1.pottery)
				.metaCategory(MetaCat.research)
				.name('Pottery')
				.icon('🏺')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 3)
						.effect(resPassive('bse_pottery', [Res.gold, 1], [Res.food, 1]))
						.effect(t1Done),
				)
				.build(),
		},
		{
			id: ResearchT1.herbalism,
			def: action()
				.id(ResearchT1.herbalism)
				.metaCategory(MetaCat.research)
				.name('Herbalism')
				.icon('🌿')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 4)
						.effect(resPassive('bse_herbalism', [Res.food, 1], [Res.happiness, 1]))
						.effect(t1Done),
				)
				.build(),
		},
		{
			id: ResearchT1.metalworking,
			def: action()
				.id(ResearchT1.metalworking)
				.metaCategory(MetaCat.research)
				.name('Metalworking')
				.icon('⚒️')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 4)
						.effect(costMod('bse_metalworking_gold', Res.gold, -2))
						.effect(resPassive('bse_metalworking_mat', [Res.materials, 1]))
						.effect(t1Done),
				)
				.build(),
		},
		{
			id: ResearchT1.sailing,
			def: action()
				.id(ResearchT1.sailing)
				.metaCategory(MetaCat.research)
				.name('Sailing')
				.icon('⛵')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 5)
						.effect(resPassive('bse_sailing', [Res.gold, 3]))
						.effect(t1Done),
				)
				.build(),
		},
		{
			id: ResearchT1.folklore,
			def: action()
				.id(ResearchT1.folklore)
				.metaCategory(MetaCat.research)
				.name('Folklore')
				.icon('📖')
				.oneTime()
				.tier(1, (t) =>
					t
						.cost(Res.knowledge, 3)
						.effect(resPassive('bse_folklore', [Res.happiness, 1], [Res.influence, 1]))
						.effect(t1Done),
				)
				.build(),
		},
	];
}
