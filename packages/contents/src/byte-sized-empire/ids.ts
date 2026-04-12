/**
 * Byte-Sized Empire — ID Constants
 *
 * All identifiers for the score-based engine-builder game mode.
 */

export const Res = {
	gold: 'resource:bse:gold',
	food: 'resource:bse:food',
	materials: 'resource:bse:materials',
	knowledge: 'resource:bse:knowledge',
	influence: 'resource:bse:influence',
	population: 'resource:bse:population',
	populationCap: 'resource:bse:population-cap',
	defense: 'resource:bse:defense',
	castleHP: 'resource:bse:castle-hp',
	happiness: 'resource:bse:happiness',
	vp: 'resource:bse:vp',
	ap: 'resource:bse:action-points',
	turnsRemaining: 'resource:bse:turns-remaining',
	t1Done: 'resource:bse:t1-research-done',
	t2Done: 'resource:bse:t2-research-done',
} as const;

export const Building = {
	farmComplex: 'building:bse:farm-complex',
	granary: 'building:bse:granary',
	workshop: 'building:bse:workshop',
	market: 'building:bse:market',
	library: 'building:bse:library',
	academy: 'building:bse:academy',
	temple: 'building:bse:temple',
	tavern: 'building:bse:tavern',
	barracks: 'building:bse:barracks',
	fortress: 'building:bse:fortress',
	townHall: 'building:bse:town-hall',
	monument: 'building:bse:monument',
} as const;

export const Dev = {
	farm: 'dev:bse:farm',
	mine: 'dev:bse:mine',
	cottage: 'dev:bse:cottage',
	school: 'dev:bse:school',
	garden: 'dev:bse:garden',
	tradingPost: 'dev:bse:trading-post',
} as const;

export const Act = {
	harvest: 'action:bse:harvest',
	harvestGold: 'action:bse:harvest-gold',
	harvestFood: 'action:bse:harvest-food',
	harvestMaterials: 'action:bse:harvest-materials',
	harvestKnowledge: 'action:bse:harvest-knowledge',
	harvestInfluence: 'action:bse:harvest-influence',
	recruit: 'action:bse:recruit',
	trade: 'action:bse:trade',
	tradeGold: 'action:bse:trade-gold',
	tradeFood: 'action:bse:trade-food',
	tradeMaterials: 'action:bse:trade-materials',
	tradeKnowledge: 'action:bse:trade-knowledge',
	tradeInfluence: 'action:bse:trade-influence',
	raid: 'action:bse:raid',
	festival: 'action:bse:festival',
	decree: 'action:bse:decree',
	decreeLevy: 'action:bse:decree-levy',
	decreeConscription: 'action:bse:decree-conscription',
	decreeFortify: 'action:bse:decree-fortify',
	decreeProclamation: 'action:bse:decree-proclamation',
	propaganda: 'action:bse:propaganda',
	spy: 'action:bse:spy',
	sabotage: 'action:bse:sabotage',
	initialSetup: 'action:bse:initial-setup',
	compensation: 'action:bse:compensation',
	buildFarmComplex: 'action:bse:build-farm-complex',
	buildGranary: 'action:bse:build-granary',
	buildWorkshop: 'action:bse:build-workshop',
	buildMarket: 'action:bse:build-market',
	buildLibrary: 'action:bse:build-library',
	buildAcademy: 'action:bse:build-academy',
	buildTemple: 'action:bse:build-temple',
	buildTavern: 'action:bse:build-tavern',
	buildBarracks: 'action:bse:build-barracks',
	buildFortress: 'action:bse:build-fortress',
	buildTownHall: 'action:bse:build-town-hall',
	buildMonument: 'action:bse:build-monument',
	developFarm: 'action:bse:develop-farm',
	developMine: 'action:bse:develop-mine',
	developCottage: 'action:bse:develop-cottage',
	developSchool: 'action:bse:develop-school',
	developGarden: 'action:bse:develop-garden',
	developTradingPost: 'action:bse:develop-trading-post',
} as const;

export const MetaCat = {
	commands: 'meta:bse:commands',
	research: 'meta:bse:research',
} as const;

export const ActionCat = {
	basic: 'cat:bse:basic',
	build: 'cat:bse:build',
	develop: 'cat:bse:develop',
	interference: 'cat:bse:interference',
} as const;

export const Phase = {
	growth: 'phase:bse:growth',
	upkeep: 'phase:bse:upkeep',
	main: 'phase:bse:main',
} as const;

export const Step = {
	gainIncome: 'step:bse:gain-income',
	raiseStrength: 'step:bse:raise-strength',
	payUpkeep: 'step:bse:pay-upkeep',
	foodResolution: 'step:bse:food-resolution',
	warRecovery: 'step:bse:war-recovery',
	gainAP: 'step:bse:gain-ap',
	decrementTurns: 'step:bse:decrement-turns',
	main: 'step:bse:main',
} as const;

export const Trigger = {
	gainIncome: 'trigger:bse:gain-income',
	payUpkeep: 'trigger:bse:pay-upkeep',
	gainAP: 'trigger:bse:gain-ap',
} as const;

export const SysRole = {
	initialSetup: 'initial-setup',
	compensation: 'compensation',
} as const;

// Research IDs are generated in research.ts
// to keep this file manageable.
