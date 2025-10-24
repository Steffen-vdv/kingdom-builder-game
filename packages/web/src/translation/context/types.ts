import type {
	ActionCategoryConfig,
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	EffectDef,
	PlayerStartConfig,
	PopulationConfig,
	SessionMetadataFormat,
	SessionPassiveRecordSnapshot,
	SessionPassiveSummary,
	SessionPlayerId,
	SessionRecentResourceGain,
	SessionResourceBoundsV2,
	SessionResourceCatalogV2,
	SessionRuleSnapshot,
} from '@kingdom-builder/protocol';

/**
 * Lightweight registry surface exposed to translators. Only lookup helpers that
 * are used within translation paths are represented to discourage direct
 * coupling with the protocol registry implementation.
 */
export interface TranslationRegistry<TDefinition> {
	get(id: string): TDefinition;
	has(id: string): boolean;
}

export interface TranslationActionCategoryDefinition {
	readonly id: string;
	readonly title: string;
	readonly subtitle: string;
	readonly description?: string;
	readonly icon: string;
	readonly order: number;
	readonly layout: ActionCategoryConfig['layout'];
	readonly hideWhenEmpty: boolean;
	readonly analyticsKey?: string;
}

export interface TranslationActionCategoryRegistry
	extends TranslationRegistry<TranslationActionCategoryDefinition> {
	list(): readonly TranslationActionCategoryDefinition[];
}

export interface TranslationIconLabel {
	icon?: string;
	label?: string;
	description?: string;
	displayAsPercent?: boolean;
	format?: SessionMetadataFormat;
}

export interface TranslationModifierInfo {
	icon?: string;
	label?: string;
}

export interface TranslationTriggerAsset {
	icon?: string;
	future?: string;
	past?: string;
	label?: string;
}

export interface TranslationAssets {
	readonly resources: Readonly<Record<string, TranslationIconLabel>>;
	readonly stats: Readonly<Record<string, TranslationIconLabel>>;
	readonly populations: Readonly<Record<string, TranslationIconLabel>>;
	readonly population: Readonly<TranslationIconLabel>;
	readonly land: Readonly<TranslationIconLabel>;
	readonly slot: Readonly<TranslationIconLabel>;
	readonly passive: Readonly<TranslationIconLabel>;
	readonly transfer: Readonly<TranslationIconLabel>;
	readonly upkeep: Readonly<TranslationIconLabel>;
	readonly modifiers: Readonly<Record<string, TranslationModifierInfo>>;
	readonly triggers: Readonly<Record<string, TranslationTriggerAsset>>;
	readonly tierSummaries: Readonly<Record<string, string>>;
	formatPassiveRemoval(description: string): string;
}

/**
 * Minimal passive descriptor pulled through the translation layer. This mirrors
 * the subset of {@link PassiveRecord} properties that log formatters and
 * resource source helpers inspect today.
 */
export type TranslationPassiveDescriptor = {
	icon?: string;
	meta?: { source?: { icon?: string } };
};

export type TranslationPassiveDefinition = SessionPassiveRecordSnapshot;

/**
 * Map of evaluator modifier identifiers to the owning modifier instances. The
 * values remain intentionally untyped because translation formatters only
 * inspect presence and icon metadata.
 */
export type TranslationPassiveModifierMap = ReadonlyMap<
	string,
	ReadonlyMap<string, unknown>
>;

/**
 * Read-only view over the passive manager for translators. The surface area is
 * intentionally tiny; imperative mutators are omitted while the existing log
 * helpers continue to rely on evaluation metadata.
 */
export interface TranslationPassives {
	list(owner?: SessionPlayerId): SessionPassiveSummary[];
	get(
		id: string,
		owner: SessionPlayerId,
	): TranslationPassiveDescriptor | undefined;
	getDefinition(
		id: string,
		owner: SessionPlayerId,
	): TranslationPassiveDefinition | undefined;
	definitions(
		owner: SessionPlayerId,
	): ReadonlyArray<TranslationPassiveDefinition>;
	readonly evaluationMods: TranslationPassiveModifierMap;
}

export interface TranslationResourceV2Metadata {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string | null;
	readonly displayAsPercent?: boolean;
	readonly format?: SessionMetadataFormat;
}

export interface TranslationResourceV2MetadataSelectors {
	list(): readonly TranslationResourceV2Metadata[];
	get(id: string): TranslationResourceV2Metadata;
	has(id: string): boolean;
}

export interface TranslationSignedResourceGainSelectors {
	list(): readonly SessionRecentResourceGain[];
	positives(): readonly SessionRecentResourceGain[];
	negatives(): readonly SessionRecentResourceGain[];
	forResource(id: string): readonly SessionRecentResourceGain[];
	sumForResource(id: string): number;
}

export type TranslationResourceCatalogV2 = SessionResourceCatalogV2 | undefined;

/**
 * Minimal phase metadata consumed by translation renderers.
 */
export interface TranslationPhaseStep {
	id: string;
	title?: string;
	icon?: string;
	triggers?: readonly string[];
	effects?: readonly EffectDef[];
}

export interface TranslationPhase {
	id: string;
	icon?: string;
	label?: string;
	steps?: readonly TranslationPhaseStep[];
}

/**
 * Snapshot of active/opposing players required by translation helpers. The
 * fields mirror the read access patterns used when formatting stat breakdowns
 * and passive ownership.
 */
export interface TranslationPlayer {
	id: SessionPlayerId;
	name?: string;
	resources: Record<string, number>;
	stats: Record<string, number>;
	population: Record<string, number>;
	resourcesV2?: Readonly<Record<string, number>>;
	resourceBoundsV2?: Readonly<Record<string, SessionResourceBoundsV2>>;
}

/**
 * Translation-focused view over the engine context. Implementations are free to
 * wrap the full legacy engine context as long as the read-only surface
 * documented here remains stable.
 */
export interface TranslationContext {
	readonly actions: TranslationRegistry<ActionConfig>;
	readonly actionCategories: TranslationActionCategoryRegistry;
	readonly buildings: TranslationRegistry<BuildingConfig>;
	readonly developments: TranslationRegistry<DevelopmentConfig>;
	readonly populations: TranslationRegistry<PopulationConfig>;
	readonly passives: TranslationPassives;
	readonly phases: readonly TranslationPhase[];
	readonly activePlayer: TranslationPlayer;
	readonly opponent: TranslationPlayer;
	readonly rules: SessionRuleSnapshot;
	readonly recentResourceGains: ReadonlyArray<{
		key: string;
		amount: number;
	}>;
	readonly compensations: Readonly<Record<SessionPlayerId, PlayerStartConfig>>;
	pullEffectLog<T>(key: string): T | undefined;
	readonly actionCostResource?: string;
	readonly assets: TranslationAssets;
	readonly resourcesV2: TranslationResourceCatalogV2;
	readonly resourceMetadataV2: TranslationResourceV2MetadataSelectors;
	readonly resourceGroupMetadataV2: TranslationResourceV2MetadataSelectors;
	readonly signedResourceGains: TranslationSignedResourceGainSelectors;
}
