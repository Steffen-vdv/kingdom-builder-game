/**
 * Byte-Sized Empire — Tier 3 Research Definitions
 *
 * Each T3 tech costs 10-14 Knowledge, has a single tier (tier 3),
 * and requires Res.t2Done >= 2.
 */
import type { ActionConfig, RequirementConfig } from '@kingdom-builder/protocol';
import { Types, ResourceMethods, PassiveMethods, LandMethods, resourceAmountChange } from '@kingdom-builder/contents-sdk';
import { action, effect, passiveParams, compareRequirement, resourceEvaluator } from '../infrastructure/builders';
import { Res, MetaCat } from './ids';
import { ResearchT3 } from './researchIds';

type Entry = { id: string; def: ActionConfig };

const t2Req: RequirementConfig = compareRequirement().left(resourceEvaluator().resourceId(Res.t2Done)).operator('gte').right(2).message('Requires 2 completed Tier 2 researches.').build();

function passive(id: string) {
	return passiveParams().id(id);
}

function resPassive(id: string, resId: string, amount: number) {
	return effect(Types.Passive, PassiveMethods.ADD)
		.params(passive(id))
		.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(resId, amount)).build())
		.build();
}

export function t3Research(): Entry[] {
	return [
		// Industrial Revolution: +5 VP, +3 Gold/turn,
		// +3 Materials/turn
		{
			id: ResearchT3.industrialRevolution,
			def: action()
				.id(ResearchT3.industrialRevolution)
				.metaCategory(MetaCat.research)
				.name('Industrial Revolution')
				.icon('🏭')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 12)
						.requirement(t2Req)
						.effect(
							effect(Types.Passive, PassiveMethods.ADD)
								.params(passive('bse_industrial'))
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.vp, 5)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.gold, 3)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.materials, 3)).build())
								.build(),
						),
				)
				.build(),
		},

		// University: +4 Knowledge/turn
		{
			id: ResearchT3.university,
			def: action()
				.id(ResearchT3.university)
				.metaCategory(MetaCat.research)
				.name('University')
				.icon('🎓')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 11)
						.requirement(t2Req)
						.effect(resPassive('bse_university', Res.knowledge, 4)),
				)
				.build(),
		},

		// Grand Cathedral: +3 Happiness, +3 Influence/turn
		{
			id: ResearchT3.grandCathedral,
			def: action()
				.id(ResearchT3.grandCathedral)
				.metaCategory(MetaCat.research)
				.name('Grand Cathedral')
				.icon('⛪')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 11)
						.requirement(t2Req)
						.effect(
							effect(Types.Passive, PassiveMethods.ADD)
								.params(passive('bse_grand_cathedral'))
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.happiness, 3)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.influence, 3)).build())
								.build(),
						),
				)
				.build(),
		},

		// Military Academy: +5 Defense
		{
			id: ResearchT3.militaryAcademy,
			def: action()
				.id(ResearchT3.militaryAcademy)
				.metaCategory(MetaCat.research)
				.name('Military Academy')
				.icon('🏰')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 10)
						.requirement(t2Req)
						.effect(resPassive('bse_military_academy', Res.defense, 5)),
				)
				.build(),
		},

		// Trade Empire: +5 Gold/turn
		{
			id: ResearchT3.tradeEmpire,
			def: action()
				.id(ResearchT3.tradeEmpire)
				.metaCategory(MetaCat.research)
				.name('Trade Empire')
				.icon('🌐')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 12)
						.requirement(t2Req)
						.effect(resPassive('bse_trade_empire', Res.gold, 5)),
				)
				.build(),
		},

		// Great Hospital: +2 Pop cap, +2 Food/turn
		{
			id: ResearchT3.greatHospital,
			def: action()
				.id(ResearchT3.greatHospital)
				.metaCategory(MetaCat.research)
				.name('Great Hospital')
				.icon('🏥')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 11)
						.requirement(t2Req)
						.effect(
							effect(Types.Passive, PassiveMethods.ADD)
								.params(passive('bse_great_hospital'))
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.populationCap, 2)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.food, 2)).build())
								.build(),
						),
				)
				.build(),
		},

		// Constitution: +3 Happiness, +8 VP
		{
			id: ResearchT3.constitution,
			def: action()
				.id(ResearchT3.constitution)
				.metaCategory(MetaCat.research)
				.name('Constitution')
				.icon('📜')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 14)
						.requirement(t2Req)
						.effect(
							effect(Types.Passive, PassiveMethods.ADD)
								.params(passive('bse_constitution'))
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.happiness, 3)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.vp, 8)).build())
								.build(),
						),
				)
				.build(),
		},

		// Master Plan: +10 VP
		{
			id: ResearchT3.masterPlan,
			def: action()
				.id(ResearchT3.masterPlan)
				.metaCategory(MetaCat.research)
				.name('Master Plan')
				.icon('📐')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 12)
						.requirement(t2Req)
						.effect(resPassive('bse_master_plan', Res.vp, 10)),
				)
				.build(),
		},

		// Renaissance: +2 Gold/turn, +2 Materials/turn,
		// +2 Knowledge/turn
		{
			id: ResearchT3.renaissance,
			def: action()
				.id(ResearchT3.renaissance)
				.metaCategory(MetaCat.research)
				.name('Renaissance')
				.icon('🎨')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 13)
						.requirement(t2Req)
						.effect(
							effect(Types.Passive, PassiveMethods.ADD)
								.params(passive('bse_renaissance'))
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.gold, 2)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.materials, 2)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.knowledge, 2)).build())
								.build(),
						),
				)
				.build(),
		},

		// Grand Monument: +12 VP
		{
			id: ResearchT3.grandMonument,
			def: action()
				.id(ResearchT3.grandMonument)
				.metaCategory(MetaCat.research)
				.name('Grand Monument')
				.icon('🗿')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 10)
						.requirement(t2Req)
						.effect(resPassive('bse_grand_monument', Res.vp, 12)),
				)
				.build(),
		},

		// Philosopher's Stone: +3 Knowledge/turn,
		// +2 Gold/turn
		{
			id: ResearchT3.philosophersStone,
			def: action()
				.id(ResearchT3.philosophersStone)
				.metaCategory(MetaCat.research)
				.name("Philosopher's Stone")
				.icon('💎')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 13)
						.requirement(t2Req)
						.effect(
							effect(Types.Passive, PassiveMethods.ADD)
								.params(passive('bse_philosophers_stone'))
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.knowledge, 3)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.gold, 2)).build())
								.build(),
						),
				)
				.build(),
		},

		// Manifest Destiny: +3 Population immediately,
		// +4 land slots (2 lands x 2 slots each)
		{
			id: ResearchT3.manifestDestiny,
			def: action()
				.id(ResearchT3.manifestDestiny)
				.metaCategory(MetaCat.research)
				.name('Manifest Destiny')
				.icon('🗺️')
				.oneTime()
				.tier(3, (t) =>
					t
						.cost(Res.knowledge, 11)
						.requirement(t2Req)
						.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.population, 3)).build())
						.effect(effect(Types.Land, LandMethods.ADD).param('count', 2).build()),
				)
				.build(),
		},
	];
}
