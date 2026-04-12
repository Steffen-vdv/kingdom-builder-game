/**
 * Kingdom Builder - Tutorial Content Package
 *
 * A simplified starter mode that teaches players the basics of
 * kingdom management: expanding land, collecting taxes, developing
 * farms and houses, and building a mill.
 *
 * Extends the base package by removing combat, research, hiring,
 * and advanced content to reduce cognitive load for new players.
 */

import type { ContentPackage, ActionDef } from '@boardsmith/contents-sdk';
import { SystemRole, Types, ResourceMethods, LandMethods, DevelopmentMethods } from '@boardsmith/contents-sdk';
import { createBasePackage } from '../base';
import { ActionId, SystemActions, BasicActions, DevelopActions, BuildActions, MetaCategory } from '../content/actions';
import { DevelopmentId } from '../content/developments';
import { BuildingId } from '../content/buildings';
import { Resource } from '../content/constants';
import { action, effect } from '../../infrastructure/builders';
import { resourceChange } from '../content/resource';

/** Actions available in the tutorial (non-system). */
const TUTORIAL_ACTION_IDS: ReadonlySet<string> = new Set([
	BasicActions.expand,
	BasicActions.tax,
	DevelopActions.develop_farm,
	DevelopActions.develop_house,
	BuildActions.build_mill,
	BuildActions.build_town_charter,
]);

/** System actions that must always be present. */
const SYSTEM_ACTION_IDS: ReadonlySet<string> = new Set([SystemActions.initial_setup, SystemActions.initial_setup_devmode, SystemActions.compensation, BasicActions.till]);

/** Developments available in the tutorial. */
const TUTORIAL_DEVELOPMENT_IDS: ReadonlySet<string> = new Set([DevelopmentId.Farm, DevelopmentId.House, DevelopmentId.Garden]);

/** Buildings available in the tutorial. */
const TUTORIAL_BUILDING_IDS: ReadonlySet<string> = new Set([BuildingId.Mill, BuildingId.TownCharter]);

/**
 * Builds the tutorial initial_setup action.
 *
 * Compared to the base initial_setup:
 * - 15 gold instead of 10 (more room to experiment)
 * - 2 lands: one with a Farm, one tilled (ready for development)
 * - Same castle HP, population cap, growth, and starting council
 */
function buildTutorialSetupAction(): ActionDef {
	return action()
		.id(ActionId.initial_setup)
		.metaCategory(MetaCategory.Commands)
		.name('Initial Setup')
		.icon('🎮')
		.system(SystemRole.INITIAL_SETUP)
		.free()
		.tier(1, (t) =>
			t
				// Resources — generous gold for experimentation
				.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.gold).amount(15).reject().build()).build())
				.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.castleHP).amount(100).reject().build()).build())
				// Stats
				.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(1).reject().build()).build())
				.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.25).reject().build()).build())
				// Population
				.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.council).amount(1).reject().build()).build())
				// Land 1: with a pre-built Farm
				.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
				.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', DevelopmentId.Farm).build())
				// Land 2: tilled and ready for development
				.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
				.effect(effect(Types.Land, LandMethods.TILL).build()),
		)
		.build();
}

/**
 * Creates the tutorial content package.
 *
 * Imports the full base game and strips it down to a beginner-friendly
 * subset: expand, tax, develop (farm/house), and build (mill/charter).
 * No combat, research, or hiring — just core economy mechanics.
 */
export function createTutorialPackage(): ContentPackage {
	const base = createBasePackage();

	// --- Actions: keep only tutorial + system actions ---
	for (const id of base.actions.keys()) {
		if (!TUTORIAL_ACTION_IDS.has(id) && !SYSTEM_ACTION_IDS.has(id)) {
			base.actions.remove(id);
		}
	}

	// Override initial_setup with tutorial-friendly version
	base.actions.remove(ActionId.initial_setup);
	base.actions.add(ActionId.initial_setup, buildTutorialSetupAction());

	// --- Meta-categories: remove Research entirely ---
	base.actionMetaCategories.remove(MetaCategory.Research);

	// --- Action categories: remove Hire (no hire actions) ---
	if (base.actionCategories.has('hire')) {
		base.actionCategories.remove('hire');
	}

	// --- Developments: keep only tutorial set ---
	for (const id of base.developments.keys()) {
		if (!TUTORIAL_DEVELOPMENT_IDS.has(id)) {
			base.developments.remove(id);
		}
	}

	// --- Buildings: keep only tutorial set ---
	for (const id of base.buildings.keys()) {
		if (!TUTORIAL_BUILDING_IDS.has(id)) {
			base.buildings.remove(id);
		}
	}

	return {
		...base,
		id: 'kingdom-builder:tutorial',
		name: 'Kingdom Builder Tutorial',
		description: 'Learn the basics with simplified gameplay' + ' — expand, tax, farm, and build.',
	};
}
