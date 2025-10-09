import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PlayerStartConfig,
	SessionPassiveRecordSnapshot,
	SessionPassiveSummary,
	SessionPassiveEvaluationModifierMap,
	SessionPlayerId,
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
	id: SessionPlayerId;
	name?: string;
	resources: Record<string, number>;
	stats: Record<string, number>;
	population: Record<string, number>;
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
	readonly rules: SessionRuleSnapshot;
	readonly recentResourceGains: ReadonlyArray<{
		key: string;
		amount: number;
	}>;
	readonly compensations: Readonly<Record<SessionPlayerId, PlayerStartConfig>>;
	pullEffectLog<T>(key: string): T | undefined;
	readonly actionCostResource?: string;
}

export interface LegacyPlayerLand {
	readonly id: string;
	readonly slotsMax: number;
	readonly slotsUsed: number;
	readonly developments: ReadonlyArray<string>;
}

export interface LegacyEnginePlayer extends TranslationPlayer {
	readonly lands?: ReadonlyArray<LegacyPlayerLand>;
	readonly buildings?: ReadonlyArray<string> | ReadonlySet<string>;
}

export interface LegacyEngineContext {
	readonly game: {
		readonly players: ReadonlyArray<{
			id: SessionPlayerId;
			population: Record<string, number>;
			passives: SessionPassiveSummary[];
		}>;
	};
	readonly activePlayer: LegacyEnginePlayer;
	readonly opponent: LegacyEnginePlayer;
	readonly passives: {
		list(owner?: SessionPlayerId): SessionPassiveSummary[];
		get?(
			id: string,
			owner: SessionPlayerId,
		): TranslationPassiveDescriptor | undefined;
		evaluationMods?:
			| TranslationPassiveModifierMap
			| SessionPassiveEvaluationModifierMap
			| ReadonlyMap<string, ReadonlyMap<string, unknown>>;
	};
	readonly buildings: TranslationRegistry<{ icon?: string; name?: string }>;
	readonly developments: TranslationRegistry<{ icon?: string; name?: string }>;
}
