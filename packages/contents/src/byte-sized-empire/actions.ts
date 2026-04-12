/**
 * Byte-Sized Empire — Action Definitions
 *
 * All game actions for the score-based engine-builder mode.
 * Build and develop actions live in buildDevelopActions.ts.
 */
import { Registry, actionSchema } from '@kingdom-builder/protocol';
import type { ZodType } from 'zod';
import type { ActionDef } from '@kingdom-builder/contents-sdk';
import { Types, ResourceMethods, LandMethods, DevelopmentMethods, action, resourceAmountChange, resourceTransferAmount } from '@kingdom-builder/contents-sdk';
import {
	effect,
	compareRequirement,
	resourceEvaluator,
	actionEffectGroup,
	actionEffectGroupOption,
	actionCategory,
	actionMetaCategory,
	pool,
	tierProgressionCurve,
	tierWeights,
} from '../infrastructure/builders';
import type { ActionCategoryConfig, ActionMetaCategoryConfig } from '../infrastructure/builders';
import { Act, Res, Dev, MetaCat, ActionCat, SysRole } from './ids';
import { allBuildActions, allDevelopActions } from './buildDevelopActions';

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function resAdd(resId: string, amount: number) {
	return effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(resId, amount)).build();
}

function resTransfer(resId: string, amount: number) {
	return effect(Types.Resource, ResourceMethods.TRANSFER).params(resourceTransferAmount(resId, amount)).build();
}

const PICK_RESOURCES: ReadonlyArray<{
	key: string;
	icon: string;
	resId: string;
}> = [
	{ key: 'Gold', icon: '🪙', resId: Res.gold },
	{ key: 'Food', icon: '🌾', resId: Res.food },
	{ key: 'Materials', icon: '🪵', resId: Res.materials },
	{ key: 'Knowledge', icon: '📖', resId: Res.knowledge },
	{ key: 'Influence', icon: '👑', resId: Res.influence },
];

function gainSubAction(id: string, name: string, resId: string, amount: number): ActionDef {
	return action().id(id).metaCategory(MetaCat.commands).name(name).icon('📦').system().free().effect(resAdd(resId, amount)).build();
}

function pickGroup(prefix: string, ids: Record<string, string>) {
	const group = actionEffectGroup(`${prefix}_pick`);
	for (const { key, icon } of PICK_RESOURCES) {
		group.option(actionEffectGroupOption(`${prefix}_${key.toLowerCase()}`).icon(icon).action(ids[key]!));
	}
	return group;
}

const HARVEST_IDS: Record<string, string> = {
	Gold: Act.harvestGold,
	Food: Act.harvestFood,
	Materials: Act.harvestMaterials,
	Knowledge: Act.harvestKnowledge,
	Influence: Act.harvestInfluence,
};

const TRADE_IDS: Record<string, string> = {
	Gold: Act.tradeGold,
	Food: Act.tradeFood,
	Materials: Act.tradeMaterials,
	Knowledge: Act.tradeKnowledge,
	Influence: Act.tradeInfluence,
};

const popCapReq = compareRequirement().left(resourceEvaluator().resourceId(Res.population)).operator('lt').right(resourceEvaluator().resourceId(Res.populationCap)).build();

// ═══════════════════════════════════════════════════════════
// ACTION REGISTRY
// ═══════════════════════════════════════════════════════════

export function createActionRegistry() {
	const schema = actionSchema.passthrough();
	const registry = new Registry<ActionDef>(schema as unknown as ZodType<ActionDef>);

	// ── Sub-actions for effect group options ───────────────
	for (const { key, resId } of PICK_RESOURCES) {
		registry.add(HARVEST_IDS[key]!, gainSubAction(HARVEST_IDS[key]!, `Harvest ${key}`, resId, 2));
		registry.add(TRADE_IDS[key]!, gainSubAction(TRADE_IDS[key]!, `Trade ${key}`, resId, 2));
	}

	registry.add(Act.decreeLevy, gainSubAction(Act.decreeLevy, 'Levy', Res.gold, 3));
	registry.add(Act.decreeConscription, gainSubAction(Act.decreeConscription, 'Conscription', Res.defense, 2));
	registry.add(Act.decreeFortify, gainSubAction(Act.decreeFortify, 'Fortify', Res.castleHP, 10));
	registry.add(Act.decreeProclamation, gainSubAction(Act.decreeProclamation, 'Proclamation', Res.influence, 3));

	// ── SYSTEM ────────────────────────────────────────────
	registry.add(
		Act.initialSetup,
		action()
			.id(Act.initialSetup)
			.metaCategory(MetaCat.commands)
			.name('Initial Setup')
			.icon('🎮')
			.system(SysRole.initialSetup)
			.free()
			.effect(resAdd(Res.gold, 5))
			.effect(resAdd(Res.food, 4))
			.effect(resAdd(Res.materials, 4))
			.effect(resAdd(Res.knowledge, 0))
			.effect(resAdd(Res.influence, 0))
			.effect(resAdd(Res.population, 2))
			.effect(resAdd(Res.populationCap, 5))
			.effect(resAdd(Res.happiness, 0))
			.effect(resAdd(Res.defense, 0))
			.effect(resAdd(Res.castleHP, 100))
			.effect(resAdd(Res.ap, 2))
			.effect(resAdd(Res.turnsRemaining, 30))
			.effect(resAdd(Res.t1Done, 0))
			.effect(resAdd(Res.t2Done, 0))
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 4).build())
			.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', Dev.farm).build())
			.build(),
	);

	registry.add(Act.compensation, action().id(Act.compensation).metaCategory(MetaCat.commands).name('Compensation').icon('⚖️').system(SysRole.compensation).free().effect(resAdd(Res.ap, 1)).build());

	// ── ALWAYS AVAILABLE ──────────────────────────────────
	registry.add(
		Act.harvest,
		action().id(Act.harvest).metaCategory(MetaCat.commands).name('Harvest').icon('🧺').effectGroup(pickGroup('harvest', HARVEST_IDS)).category(ActionCat.basic).order(1).build(),
	);

	registry.add(
		Act.recruit,
		action()
			.id(Act.recruit)
			.metaCategory(MetaCat.commands)
			.name('Recruit')
			.icon('🧑‍🤝‍🧑')
			.cost(Res.food, 2)
			.cost(Res.gold, 1)
			.requirement(popCapReq)
			.effect(resAdd(Res.population, 1))
			.category(ActionCat.basic)
			.order(2)
			.build(),
	);

	// ── UNLOCKABLE ────────────────────────────────────────
	registry.add(
		Act.trade,
		action().id(Act.trade).metaCategory(MetaCat.commands).name('Trade').icon('🔁').locked().effectGroup(pickGroup('trade', TRADE_IDS)).category(ActionCat.basic).order(3).build(),
	);

	registry.add(
		Act.raid,
		action().id(Act.raid).metaCategory(MetaCat.commands).name('Raid').icon('🗡️').locked().cost(Res.gold, 2).effect(resTransfer(Res.gold, 4)).category(ActionCat.interference).order(4).build(),
	);

	registry.add(
		Act.festival,
		action()
			.id(Act.festival)
			.metaCategory(MetaCat.commands)
			.name('Festival')
			.icon('🎉')
			.locked()
			.cost(Res.gold, 3)
			.effect(resAdd(Res.happiness, 2))
			.effect(resAdd(Res.influence, 2))
			.category(ActionCat.basic)
			.order(5)
			.build(),
	);

	const decreeGroup = actionEffectGroup('decree_options')
		.option(actionEffectGroupOption('opt_levy').icon('💰').action(Act.decreeLevy))
		.option(actionEffectGroupOption('opt_conscription').icon('⚔️').action(Act.decreeConscription))
		.option(actionEffectGroupOption('opt_fortify').icon('🏰').action(Act.decreeFortify))
		.option(actionEffectGroupOption('opt_proclamation').icon('📣').action(Act.decreeProclamation));

	registry.add(Act.decree, action().id(Act.decree).metaCategory(MetaCat.commands).name('Decree').icon('📜').locked().effectGroup(decreeGroup).category(ActionCat.basic).order(6).build());

	// ── INTERFERENCE ──────────────────────────────────────
	registry.add(
		Act.propaganda,
		action()
			.id(Act.propaganda)
			.metaCategory(MetaCat.commands)
			.name('Propaganda')
			.icon('📢')
			.locked()
			.cost(Res.influence, 3)
			.effect(resTransfer(Res.happiness, 1))
			.category(ActionCat.interference)
			.order(7)
			.build(),
	);

	registry.add(
		Act.spy,
		action().id(Act.spy).metaCategory(MetaCat.commands).name('Spy').icon('🕵️').locked().cost(Res.gold, 2).effect(resAdd(Res.knowledge, 1)).category(ActionCat.interference).order(8).build(),
	);

	registry.add(
		Act.sabotage,
		action()
			.id(Act.sabotage)
			.metaCategory(MetaCat.commands)
			.name('Sabotage')
			.icon('💣')
			.locked()
			.cost(Res.gold, 3)
			.cost(Res.influence, 2)
			.effect(resAdd(Res.influence, 1))
			.category(ActionCat.interference)
			.order(9)
			.build(),
	);

	// ── BUILD + DEVELOP (from helper) ─────────────────────
	for (const { id, def } of allBuildActions()) {
		registry.add(id, def);
	}
	for (const { id, def } of allDevelopActions()) {
		registry.add(id, def);
	}

	return registry;
}

// ═══════════════════════════════════════════════════════════
// ACTION CATEGORY REGISTRY
// ═══════════════════════════════════════════════════════════

export function createActionCategoryRegistry() {
	const registry = new Registry<ActionCategoryConfig>();
	const cats = [
		actionCategory().id(ActionCat.basic).label('Basic').icon('⚙️').order(0).layout('grid-primary').description('Core commands available every turn.').build(),
		actionCategory().id(ActionCat.build).label('Build').icon('🏗️').order(1).layout('grid-secondary').description('Construct buildings for permanent bonuses.').build(),
		actionCategory().id(ActionCat.develop).label('Develop').icon('🌱').order(2).layout('grid-secondary').description('Place developments on land slots.').build(),
		actionCategory().id(ActionCat.interference).label('Interference').icon('🗡️').order(3).layout('grid-secondary').description('Actions that affect your opponent.').build(),
	];
	for (const cat of cats) {
		registry.add(cat.id, cat);
	}
	return registry;
}

// ═══════════════════════════════════════════════════════════
// ACTION META-CATEGORY REGISTRY
// ═══════════════════════════════════════════════════════════

export function createActionMetaCategoryRegistry() {
	const registry = new Registry<ActionMetaCategoryConfig>();

	registry.add(
		MetaCat.commands,
		actionMetaCategory()
			.id(MetaCat.commands)
			.label('Commands')
			.icon('⚡')
			.bindingResource(Res.ap)
			.costModel('global', 1)
			.visibilityTrigger('resource-touched')
			.order(0)
			.categories(ActionCat.basic, ActionCat.build, ActionCat.develop, ActionCat.interference)
			.build(),
	);

	registry.add(
		MetaCat.research,
		actionMetaCategory()
			.id(MetaCat.research)
			.label('Research')
			.icon('🧬')
			.bindingResource(Res.knowledge)
			.costModel('per-item')
			.visibilityTrigger('resource-touched')
			.order(1)
			.pool(
				pool()
					.size(3)
					.fillMode(
						tierProgressionCurve()
							.threshold(0, tierWeights().tier(1, 94).tier(2, 5).tier(3, 1))
							.threshold(15, tierWeights().tier(1, 70).tier(2, 25).tier(3, 5))
							.threshold(40, tierWeights().tier(1, 40).tier(2, 45).tier(3, 15))
							.threshold(80, tierWeights().tier(1, 20).tier(2, 50).tier(3, 30))
							.threshold(150, tierWeights().tier(1, 10).tier(2, 40).tier(3, 50))
							.build(),
					),
			)
			.build(),
	);

	return registry;
}
