import type {
	PassiveSummary,
	PlayerId,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	EffectDef,
	PlayerStartConfig,
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

/**
 * Minimal passive descriptor pulled through the translation layer. This mirrors
 * the subset of {@link PassiveRecord} properties that log formatters and
 * resource source helpers inspect today.
 */
export type TranslationPassiveDescriptor = {
	icon?: string;
	meta?: { source?: { icon?: string } };
};

/**
 * Full passive definition payload exposed to translation helpers. This mirrors
 * the readonly subset of {@link PassiveRecordSnapshot} fields currently used by
 * hover cards and tier summaries.
 */
export type TranslationPassiveDefinition = {
	id: string;
	name?: string;
	icon?: string;
	detail?: string;
	meta?: PassiveSummary['meta'];
	effects?: ReadonlyArray<EffectDef>;
	onGrowthPhase?: ReadonlyArray<EffectDef>;
	onUpkeepPhase?: ReadonlyArray<EffectDef>;
	onBeforeAttacked?: ReadonlyArray<EffectDef>;
	onAttackResolved?: ReadonlyArray<EffectDef>;
	[key: string]: unknown;
};

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
	list(owner?: PlayerId): PassiveSummary[];
	get(id: string, owner: PlayerId): TranslationPassiveDescriptor | undefined;
	listDefinitions(owner: PlayerId): readonly TranslationPassiveDefinition[];
	getDefinition(
		id: string,
		owner: PlayerId,
	): TranslationPassiveDefinition | undefined;
	readonly evaluationMods: TranslationPassiveModifierMap;
}

/**
 * Minimal phase metadata consumed by translation renderers.
 */
export interface TranslationPhaseStep {
	id: string;
	triggers?: readonly string[];
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
	id: PlayerId;
	name?: string;
	resources: Record<string, number>;
	stats: Record<string, number>;
	population: Record<string, number>;
}

export interface TranslationRuleSnapshot {
	tieredResourceKey: RuleSnapshot['tieredResourceKey'];
	tierDefinitions: ReadonlyArray<RuleSnapshot['tierDefinitions'][number]>;
}

/**
 * Translation-focused view over the engine context. Implementations are free to
 * wrap the full {@link LegacyEngineContext} as long as the read-only surface
 * documented here remains stable.
 */
export interface TranslationContext {
	readonly actions: TranslationRegistry<ActionConfig>;
	readonly buildings: TranslationRegistry<BuildingConfig>;
	readonly developments: TranslationRegistry<DevelopmentConfig>;
	readonly passives: TranslationPassives;
	readonly phases: readonly TranslationPhase[];
	readonly activePlayer: TranslationPlayer;
	readonly opponent: TranslationPlayer;
	readonly rules?: TranslationRuleSnapshot;
	readonly recentResourceGains: ReadonlyArray<{
		key: string;
		amount: number;
	}>;
	readonly compensations: Readonly<Record<PlayerId, PlayerStartConfig>>;
	pullEffectLog<T>(key: string): T | undefined;
	readonly actionCostResource?: string;
}
