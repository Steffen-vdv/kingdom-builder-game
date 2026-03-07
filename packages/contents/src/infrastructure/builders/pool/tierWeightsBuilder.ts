/**
 * Builder for tier weights used in pool fill mode.
 * Maps tier numbers to relative weights for weighted random selection.
 */
export interface TierWeightsConfig {
	readonly weights: Record<number, number>;
}

export class TierWeightsBuilder {
	private readonly weights: Record<number, number> = {};

	/**
	 * Adds a weight for a specific tier.
	 * @param tierNumber The tier number (must be positive integer)
	 * @param weight The relative weight (must be positive)
	 */
	tier(tierNumber: number, weight: number): this {
		if (!Number.isInteger(tierNumber) || tierNumber < 1) {
			throw new Error(`TierWeights tier number must be a positive integer, got ${tierNumber}`);
		}
		if (typeof weight !== 'number' || weight < 0) {
			throw new Error(`TierWeights weight must be a non-negative number, got ${weight}`);
		}
		if (this.weights[tierNumber] !== undefined) {
			throw new Error(`TierWeights already has weight for tier ${tierNumber}. Remove the duplicate.`);
		}
		this.weights[tierNumber] = weight;
		return this;
	}

	build(): TierWeightsConfig {
		const tierNumbers = Object.keys(this.weights).map(Number);
		if (tierNumbers.length === 0) {
			throw new Error('TierWeights must have at least one tier. Call tier() before build().');
		}
		return {
			weights: { ...this.weights },
		};
	}
}

/**
 * Creates a new tier weights builder.
 */
export function tierWeights(): TierWeightsBuilder {
	return new TierWeightsBuilder();
}
