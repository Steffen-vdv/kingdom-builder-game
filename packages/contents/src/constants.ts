/**
 * Unified constants for content creators.
 *
 * This file consolidates all ID constants used throughout the content domain.
 * Content maintainers should use these constants when defining game content.
 */

// =============================================================================
// RESOURCE IDs
// =============================================================================
// All resource identifiers are unified under ResourceId, including:
// - Core resources (gold, action points, happiness, castle HP)
// - Stats (army strength, fortification, growth, etc.)
// - Population roles (council, legion, fortifier)

export const ResourceId = {
	// Core resources
	gold: 'resource:core:gold',
	ap: 'resource:core:action-points',
	happiness: 'resource:core:happiness',
	castleHP: 'resource:core:castle-hp',

	// Stats
	populationMax: 'resource:core:max-population',
	populationTotal: 'resource:core:total-population',
	armyStrength: 'resource:core:army-strength',
	fortificationStrength: 'resource:core:fortification-strength',
	absorption: 'resource:core:absorption',
	growth: 'resource:core:growth',
	warWeariness: 'resource:core:war-weariness',

	// Population roles (these are also resource IDs)
	council: 'resource:core:council',
	legion: 'resource:core:legion',
	fortifier: 'resource:core:fortifier',
} as const;

export type ResourceIdValue = (typeof ResourceId)[keyof typeof ResourceId];

// =============================================================================
// ACTION IDs
// =============================================================================

export const ActionId = {
	// Basic actions
	raid: 'raid',
	expand: 'expand',
	holdFestival: 'hold_festival',
	plow: 'plow',
	plunder: 'plunder',
	royalDecree: 'royal_decree',
	tax: 'tax',
	till: 'till',

	// System actions
	initialSetup: 'initial_setup',
	initialSetupDevmode: 'initial_setup_devmode',
	compensation: 'compensation',

	// Development actions
	developFarm: 'develop_farm',
	developHouse: 'develop_house',
	developOutpost: 'develop_outpost',
	developWatchtower: 'develop_watchtower',

	// Hire actions
	hireCouncil: 'hire_council',
	hireLegion: 'hire_legion',
	hireFortifier: 'hire_fortifier',

	// Build actions
	buildTownCharter: 'build_town_charter',
	buildMill: 'build_mill',
	buildRaidersGuild: 'build_raiders_guild',
	buildPlowWorkshop: 'build_plow_workshop',
	buildMarket: 'build_market',
	buildBarracks: 'build_barracks',
	buildCitadel: 'build_citadel',
	buildCastleWalls: 'build_castle_walls',
	buildCastleGardens: 'build_castle_gardens',
	buildTemple: 'build_temple',
	buildPalace: 'build_palace',
	buildGreatHall: 'build_great_hall',
} as const;

export type ActionIdValue = (typeof ActionId)[keyof typeof ActionId];

// =============================================================================
// BUILDING IDs
// =============================================================================

export const BuildingId = {
	TownCharter: 'town_charter',
	Mill: 'mill',
	RaidersGuild: 'raiders_guild',
	PlowWorkshop: 'plow_workshop',
	Market: 'market',
	Barracks: 'barracks',
	Citadel: 'citadel',
	CastleWalls: 'castle_walls',
	CastleGardens: 'castle_gardens',
	Temple: 'temple',
	Palace: 'palace',
	GreatHall: 'great_hall',
} as const;

export type BuildingIdValue = (typeof BuildingId)[keyof typeof BuildingId];

// =============================================================================
// DEVELOPMENT IDs
// =============================================================================

export const DevelopmentId = {
	Farm: 'farm',
	House: 'house',
	Outpost: 'outpost',
	Watchtower: 'watchtower',
} as const;

export type DevelopmentIdValue = (typeof DevelopmentId)[keyof typeof DevelopmentId];

// =============================================================================
// PHASE & STEP IDs
// =============================================================================

export const PhaseId = {
	Growth: 'growth',
	Upkeep: 'upkeep',
	Main: 'main',
} as const;

export type PhaseIdValue = (typeof PhaseId)[keyof typeof PhaseId];

export const PhaseStepId = {
	GainIncome: 'gain_income',
	GainActionPoints: 'gain_action_points',
	RaiseStrength: 'raise_strength',
	PayUpkeep: 'pay_upkeep',
	WarRecovery: 'war_recovery',
	Main: 'main',
} as const;

export type PhaseStepIdValue = (typeof PhaseStepId)[keyof typeof PhaseStepId];

// =============================================================================
// TRIGGER EVENTS
// =============================================================================

export const Trigger = {
	GAIN_INCOME: 'gain_income',
	GAIN_AP: 'gain_ap',
	PAY_UPKEEP: 'pay_upkeep',
} as const;

export type TriggerValue = (typeof Trigger)[keyof typeof Trigger];

// =============================================================================
// FOCUS TYPES
// =============================================================================

export const Focus = {
	Economy: 'economy',
	Aggressive: 'aggressive',
	Defense: 'defense',
	Other: 'other',
} as const;

export type FocusValue = (typeof Focus)[keyof typeof Focus];

// =============================================================================
// ACTION CATEGORIES
// =============================================================================

export const ActionCategory = {
	Basic: 'basic',
	Develop: 'develop',
	Build: 'build',
	Hire: 'hire',
} as const;

export type ActionCategoryValue = (typeof ActionCategory)[keyof typeof ActionCategory];
