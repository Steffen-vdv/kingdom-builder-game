/**
 * Extended definition types for contents-sdk.
 *
 * These types extend the base protocol types with additional metadata
 * used by content builders. Games can further narrow these types or
 * use them as-is.
 */
import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	EffectDef,
} from '@kingdom-builder/protocol';
import type { FocusValue } from './focus';

/**
 * Triggered effect hooks that can be attached to buildings/developments.
 */
export interface Triggered {
	onBeforeAttacked?: EffectDef[] | undefined;
	onAttackResolved?: EffectDef[] | undefined;
	onPayUpkeepStep?: EffectDef[] | undefined;
	onGainIncomeStep?: EffectDef[] | undefined;
	onGainAPStep?: EffectDef[] | undefined;
}

/**
 * Extended action definition with content metadata.
 */
export interface ActionDef extends ActionConfig {
	/** Action category ID (games define their own categories) */
	category?: string;
	/** Display order within category */
	order?: number;
	/** Strategic focus type */
	focus?: FocusValue;
	/** System role for engine-triggered actions */
	systemRole?: string;
}

/**
 * Extended development definition with content metadata.
 */
export interface DevelopmentDef extends DevelopmentConfig, Triggered {
	order?: number;
	focus?: FocusValue;
}

/**
 * Extended building definition with content metadata.
 */
export interface BuildingDef extends BuildingConfig, Triggered {
	focus?: FocusValue;
}

export type TriggerKey = keyof Triggered;
