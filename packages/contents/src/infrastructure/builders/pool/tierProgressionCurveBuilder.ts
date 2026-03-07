import type { TierWeightsConfig } from './tierWeightsBuilder';
import { TierWeightsBuilder } from './tierWeightsBuilder';

/**
 * A threshold in the tier progression curve.
 */
export interface TierProgressionThreshold {
	readonly bindingSpent: number;
	readonly weights: Record<number, number>;
}

/**
 * Configuration for tier progression curve fill mode.
 */
export interface TierProgressionCurveConfig {
	readonly type: 'tier-progression-curve';
	readonly thresholds: readonly TierProgressionThreshold[];
}

export class TierProgressionCurveBuilder {
	private readonly thresholds: TierProgressionThreshold[] = [];

	/**
	 * Adds a threshold at a specific binding resource spent amount.
	 * @param bindingSpent Minimum binding resource spent to use this threshold
	 * @param weights Tier weights builder or config for this threshold
	 */
	threshold(bindingSpent: number, weights: TierWeightsBuilder | TierWeightsConfig): this {
		if (typeof bindingSpent !== 'number' || bindingSpent < 0) {
			throw new Error(`TierProgressionCurve bindingSpent must be non-negative, got ${bindingSpent}`);
		}

		// Check for duplicate or out-of-order thresholds
		if (this.thresholds.length > 0) {
			const lastThreshold = this.thresholds[this.thresholds.length - 1]!;
			if (bindingSpent <= lastThreshold.bindingSpent) {
				throw new Error(`TierProgressionCurve thresholds must be in ascending order. ` + `Got ${bindingSpent} after ${lastThreshold.bindingSpent}.`);
			}
		}

		const weightsConfig = weights instanceof TierWeightsBuilder ? weights.build() : weights;

		this.thresholds.push({
			bindingSpent,
			weights: weightsConfig.weights,
		});

		return this;
	}

	build(): TierProgressionCurveConfig {
		if (this.thresholds.length === 0) {
			throw new Error('TierProgressionCurve must have at least one threshold. ' + 'Call threshold() before build().');
		}

		// Ensure first threshold starts at 0
		const first = this.thresholds[0]!;
		if (first.bindingSpent !== 0) {
			throw new Error('TierProgressionCurve first threshold must have bindingSpent = 0. ' + `Got ${first.bindingSpent}.`);
		}

		return {
			type: 'tier-progression-curve',
			thresholds: [...this.thresholds],
		};
	}
}

/**
 * Creates a new tier progression curve builder.
 */
export function tierProgressionCurve(): TierProgressionCurveBuilder {
	return new TierProgressionCurveBuilder();
}
