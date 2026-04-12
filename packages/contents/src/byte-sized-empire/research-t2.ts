/**
 * Byte-Sized Empire — Tier 2 Research Definitions
 *
 * Each T2 tech costs 6-8 Knowledge, has a single tier (tier 2),
 * requires Res.t1Done >= 2, and increments Res.t2Done on
 * completion.
 */
import type { ActionConfig, RequirementConfig } from '@boardsmith/protocol';
import { Types, ResourceMethods, PassiveMethods, CostModMethods, resourceAmountChange } from '@boardsmith/contents-sdk';
import { action, effect, passiveParams, costModParams, compareRequirement, resourceEvaluator } from '../infrastructure/builders';
import { Res, MetaCat } from './ids';
import { ResearchT2 } from './researchIds';

type Entry = { id: string; def: ActionConfig };

const t1Req: RequirementConfig = compareRequirement().left(resourceEvaluator().resourceId(Res.t1Done)).operator('gte').right(2).message('Requires 2 completed Tier 1 researches.').build();

function t2Done() {
	return effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.t2Done, 1)).build();
}

function passive(id: string) {
	return passiveParams().id(id);
}

function resPassive(id: string, resId: string, amount: number) {
	return effect(Types.Passive, PassiveMethods.ADD)
		.params(passive(id))
		.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(resId, amount)).build())
		.build();
}

export function t2Research(): Entry[] {
	return [
		// Crop Rotation: +2 Food/turn, +2 Pop cap
		{
			id: ResearchT2.cropRotation,
			def: action()
				.id(ResearchT2.cropRotation)
				.metaCategory(MetaCat.research)
				.name('Crop Rotation')
				.icon('🔄')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 7)
						.requirement(t1Req)
						.effect(
							effect(Types.Passive, PassiveMethods.ADD)
								.params(passive('bse_crop_rotation'))
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.food, 2)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.populationCap, 2)).build())
								.build(),
						)
						.effect(t2Done()),
				)
				.build(),
		},

		// Architecture: Building costs -2 Materials, -2 Gold
		{
			id: ResearchT2.architecture,
			def: action()
				.id(ResearchT2.architecture)
				.metaCategory(MetaCat.research)
				.name('Architecture')
				.icon('🏗️')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 7)
						.requirement(t1Req)
						.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('bse_architecture_mat').resourceId(Res.materials).amount(-2)).build())
						.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('bse_architecture_gold').resourceId(Res.gold).amount(-2)).build())
						.effect(t2Done()),
				)
				.build(),
		},

		// Banking: +3 Gold/turn
		{
			id: ResearchT2.banking,
			def: action()
				.id(ResearchT2.banking)
				.metaCategory(MetaCat.research)
				.name('Banking')
				.icon('🏦')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 8)
						.requirement(t1Req)
						.effect(resPassive('bse_banking', Res.gold, 3))
						.effect(t2Done()),
				)
				.build(),
		},

		// Philosophy: Research costs -3 Knowledge
		{
			id: ResearchT2.philosophy,
			def: action()
				.id(ResearchT2.philosophy)
				.metaCategory(MetaCat.research)
				.name('Philosophy')
				.icon('🤔')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 7)
						.requirement(t1Req)
						.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('bse_philosophy').resourceId(Res.knowledge).amount(-3)).build())
						.effect(t2Done()),
				)
				.build(),
		},

		// Theology: +1 Happiness, +2 Influence/turn
		{
			id: ResearchT2.theology,
			def: action()
				.id(ResearchT2.theology)
				.metaCategory(MetaCat.research)
				.name('Theology')
				.icon('🕊️')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 6)
						.requirement(t1Req)
						.effect(
							effect(Types.Passive, PassiveMethods.ADD)
								.params(passive('bse_theology'))
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.happiness, 1)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.influence, 2)).build())
								.build(),
						)
						.effect(t2Done()),
				)
				.build(),
		},

		// Tactics: +3 Defense
		{
			id: ResearchT2.tactics,
			def: action()
				.id(ResearchT2.tactics)
				.metaCategory(MetaCat.research)
				.name('Tactics')
				.icon('🗺️')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 6)
						.requirement(t1Req)
						.effect(resPassive('bse_tactics', Res.defense, 3))
						.effect(t2Done()),
				)
				.build(),
		},

		// Medicine: +3 Gold/turn, Pop cap +3
		{
			id: ResearchT2.medicine,
			def: action()
				.id(ResearchT2.medicine)
				.metaCategory(MetaCat.research)
				.name('Medicine')
				.icon('💊')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 8)
						.requirement(t1Req)
						.effect(
							effect(Types.Passive, PassiveMethods.ADD)
								.params(passive('bse_medicine'))
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.gold, 3)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.populationCap, 3)).build())
								.build(),
						)
						.effect(t2Done()),
				)
				.build(),
		},

		// Engineering: +1 AP per turn (via onGainAPStep)
		{
			id: ResearchT2.engineering,
			def: action()
				.id(ResearchT2.engineering)
				.metaCategory(MetaCat.research)
				.name('Engineering')
				.icon('🔧')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 8)
						.requirement(t1Req)
						.effect(resPassive('bse_engineering', Res.ap, 1))
						.effect(t2Done()),
				)
				.build(),
		},

		// Diplomacy: +2 Influence/turn
		{
			id: ResearchT2.diplomacy,
			def: action()
				.id(ResearchT2.diplomacy)
				.metaCategory(MetaCat.research)
				.name('Diplomacy')
				.icon('🤝')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 7)
						.requirement(t1Req)
						.effect(resPassive('bse_diplomacy', Res.influence, 2))
						.effect(t2Done()),
				)
				.build(),
		},

		// Guild System: +2 Gold/turn
		{
			id: ResearchT2.guildSystem,
			def: action()
				.id(ResearchT2.guildSystem)
				.metaCategory(MetaCat.research)
				.name('Guild System')
				.icon('🏛️')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 8)
						.requirement(t1Req)
						.effect(resPassive('bse_guild_system', Res.gold, 2))
						.effect(t2Done()),
				)
				.build(),
		},

		// Navigation: +4 Gold/turn
		{
			id: ResearchT2.navigation,
			def: action()
				.id(ResearchT2.navigation)
				.metaCategory(MetaCat.research)
				.name('Navigation')
				.icon('🧭')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 8)
						.requirement(t1Req)
						.effect(resPassive('bse_navigation', Res.gold, 4))
						.effect(t2Done()),
				)
				.build(),
		},

		// Pageantry: +2 Happiness, +2 Influence/turn
		{
			id: ResearchT2.pageantry,
			def: action()
				.id(ResearchT2.pageantry)
				.metaCategory(MetaCat.research)
				.name('Pageantry')
				.icon('👑')
				.oneTime()
				.tier(2, (t) =>
					t
						.cost(Res.knowledge, 6)
						.requirement(t1Req)
						.effect(
							effect(Types.Passive, PassiveMethods.ADD)
								.params(passive('bse_pageantry'))
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.happiness, 2)).build())
								.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.influence, 2)).build())
								.build(),
						)
						.effect(t2Done()),
				)
				.build(),
		},
	];
}
