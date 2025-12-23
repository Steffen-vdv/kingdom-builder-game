import type { EffectDef } from '@kingdom-builder/protocol';
import type {
	ResourceBoundType,
	ResourceBoundValue,
	ResourceDefinition,
	ResourceDisplayHint,
	ResourceSection,
	ResourceTierTrack,
} from './types';

export interface ResourceGroupOptions {
	order?: number;
}

export interface ResourceBuilder {
	icon(icon: string): this;
	label(label: string): this;
	description(description: string): this;
	order(order: number): this;
	displayAsPercent(enabled?: boolean): this;
	allowDecimal(enabled?: boolean): this;
	/**
	 * Sets the lower bound for this resource.
	 * @param value - A static number or a ResourceBoundReference (use boundTo())
	 * @example
	 * .lowerBound(0)  // Static: can't go below 0
	 * .lowerBound(boundTo(Stat.minGold))  // Dynamic: bound to another resource
	 */
	lowerBound(value: ResourceBoundValue): this;
	/**
	 * Sets the upper bound for this resource.
	 * @param value - Static number or ResourceBoundReference (use boundTo())
	 * @example
	 * .upperBound(100)  // Static: can't exceed 100
	 * .upperBound(boundTo(Stat.populationMax))  // Dynamic bound
	 */
	upperBound(value: ResourceBoundValue): this;
	trackValueBreakdown(enabled?: boolean): this;
	trackBoundBreakdown(enabled?: boolean): this;
	group(id: string, options?: ResourceGroupOptions): this;
	tags(...tags: ReadonlyArray<string | readonly string[]>): this;
	tierTrack(track: ResourceTierTrack): this;
	globalActionCost(amount: number): this;
	/**
	 * Effects to run when this resource's value increases.
	 * Runs once per unit of increase.
	 */
	onValueIncrease(...effects: EffectDef[]): this;
	/**
	 * Effects to run when this resource's value decreases.
	 * Runs once per unit of decrease.
	 */
	onValueDecrease(...effects: EffectDef[]): this;
	/**
	 * Declares that this resource represents a bound of another resource.
	 * Used for UI display (e.g., showing "5/10" for current/max).
	 */
	boundOf(resourceId: string, boundType: ResourceBoundType): this;
	/**
	 * Sets upkeep cost per unit of this resource, paid during upkeep phase.
	 * @param resourceId - The resource to pay (e.g., gold)
	 * @param amount - Cost per unit of this resource
	 */
	upkeep(resourceId: string, amount: number): this;
	/**
	 * Effects to run during the Pay Upkeep step, per unit of this resource.
	 */
	onPayUpkeepStep(...effects: EffectDef[]): this;
	/**
	 * Effects to run during the Gain Income step, per unit of this resource.
	 */
	onGainIncomeStep(...effects: EffectDef[]): this;
	/**
	 * Effects to run during the Gain AP step, per unit of this resource.
	 */
	onGainAPStep(...effects: EffectDef[]): this;
	/**
	 * Sets the UI section for dual-column layout.
	 * - 'economy': Left column (Gold, AP, Population, Happiness)
	 * - 'combat': Right column (Castle HP, Army, Fort, Absorb, Growth)
	 */
	section(section: ResourceSection): this;
	/**
	 * Marks this resource for smaller/secondary display style.
	 * Used for supporting stats like Absorption and Growth.
	 */
	secondary(enabled?: boolean): this;
	/**
	 * Sets a display hint color for UI styling.
	 * Accepts any valid CSS color (name, hex, rgb, etc.).
	 * @example .displayHint('#ef4444') // red for offensive stats
	 * @example .displayHint('#3b82f6') // blue for defensive stats
	 */
	displayHint(hint: ResourceDisplayHint): this;
	build(): ResourceDefinition;
}
