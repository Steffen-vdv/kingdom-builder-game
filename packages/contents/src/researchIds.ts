/**
 * Research Action IDs
 *
 * Research actions are organized by their starting tier:
 * - Tier 1: Basic upgrades, may have tiers 2-3
 * - Tier 2: Advanced upgrades (no tier 1), may have tier 3
 * - Tier 3: Mastery upgrades (only tier 3)
 *
 * The pool system selects from all tiers with weighted probability
 * based on total research points spent.
 */

type ValueOf<T> = T[keyof T];

/**
 * Research actions that start at tier 1.
 * These have upgrade paths to tiers 2 and 3.
 */
export const ResearchTier1Id = {
	iron_plows: 'research:iron_plows',
	basic_masonry: 'research:basic_masonry',
	scout_training: 'research:scout_training',
	trade_routes: 'research:trade_routes',
	crop_rotation: 'research:crop_rotation',
	basic_fortification: 'research:basic_fortification',
	tax_reform: 'research:tax_reform',
	festivities: 'research:festivities',
} as const;

export type ResearchTier1Id = ValueOf<typeof ResearchTier1Id>;

/**
 * Research actions that start at tier 2.
 * These are advanced and have no tier 1, but may upgrade to tier 3.
 */
export const ResearchTier2Id = {
	steel_plows: 'research:steel_plows',
	advanced_masonry: 'research:advanced_masonry',
	military_tactics: 'research:military_tactics',
	merchant_guilds: 'research:merchant_guilds',
	irrigation: 'research:irrigation',
	siege_engineering: 'research:siege_engineering',
	bureaucratic_reform: 'research:bureaucratic_reform',
} as const;

export type ResearchTier2Id = ValueOf<typeof ResearchTier2Id>;

/**
 * Research actions that start at tier 3.
 * These are mastery level with only a single tier.
 */
export const ResearchTier3Id = {
	master_agriculture: 'research:master_agriculture',
	grand_architecture: 'research:grand_architecture',
	elite_warriors: 'research:elite_warriors',
	empire_trade: 'research:empire_trade',
	fertile_lands: 'research:fertile_lands',
	impenetrable_fortress: 'research:impenetrable_fortress',
	royal_authority: 'research:royal_authority',
} as const;

export type ResearchTier3Id = ValueOf<typeof ResearchTier3Id>;

/**
 * All research action IDs combined.
 */
export const ResearchId = {
	...ResearchTier1Id,
	...ResearchTier2Id,
	...ResearchTier3Id,
} as const;

export type ResearchId = ValueOf<typeof ResearchId>;

/**
 * Lists of research IDs by starting tier.
 * Used by the pool fill algorithm for tier-weighted selection.
 */
export const RESEARCH_TIER_1_IDS: readonly ResearchTier1Id[] = [
	ResearchTier1Id.iron_plows,
	ResearchTier1Id.basic_masonry,
	ResearchTier1Id.scout_training,
	ResearchTier1Id.trade_routes,
	ResearchTier1Id.crop_rotation,
	ResearchTier1Id.basic_fortification,
	ResearchTier1Id.tax_reform,
	ResearchTier1Id.festivities,
];

export const RESEARCH_TIER_2_IDS: readonly ResearchTier2Id[] = [
	ResearchTier2Id.steel_plows,
	ResearchTier2Id.advanced_masonry,
	ResearchTier2Id.military_tactics,
	ResearchTier2Id.merchant_guilds,
	ResearchTier2Id.irrigation,
	ResearchTier2Id.siege_engineering,
	ResearchTier2Id.bureaucratic_reform,
];

export const RESEARCH_TIER_3_IDS: readonly ResearchTier3Id[] = [
	ResearchTier3Id.master_agriculture,
	ResearchTier3Id.grand_architecture,
	ResearchTier3Id.elite_warriors,
	ResearchTier3Id.empire_trade,
	ResearchTier3Id.fertile_lands,
	ResearchTier3Id.impenetrable_fortress,
	ResearchTier3Id.royal_authority,
];

export const ALL_RESEARCH_IDS: readonly ResearchId[] = [...RESEARCH_TIER_1_IDS, ...RESEARCH_TIER_2_IDS, ...RESEARCH_TIER_3_IDS];
