import type {
	PassiveSummary,
	PlayerId,
	EngineContext as LegacyEngineContext,
} from '@kingdom-builder/engine';
import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
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
	readonly evaluationMods: TranslationPassiveModifierMap;
	/**
	 * @deprecated Temporary escape hatch for utilities that still need access to
	 * the underlying engine passive manager. Prefer modelling the missing data on
	 * {@link TranslationPassives} before using this.
	 */
	readonly legacy?: unknown;
}

/**
 * Minimal phase metadata consumed by translation renderers.
 */
export interface TranslationPhase {
	id: string;
	icon?: string;
	label?: string;
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
	readonly recentResourceGains: ReadonlyArray<{
		key: string;
		amount: number;
	}>;
	readonly compensations: Readonly<Record<PlayerId, PlayerStartConfig>>;
	pullEffectLog<T>(key: string): T | undefined;
	readonly actionCostResource?: string;
	/**
	 * @deprecated Legacy escape hatch for callers that still require the
	 * full {@link LegacyEngineContext}. Usage should be phased out in favour of
	 * the typed accessors declared above.
	 */
	readonly legacy?: LegacyEngineContext;
}
