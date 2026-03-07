import type { TierProgressionCurveConfig } from './tierProgressionCurveBuilder';
import { TierProgressionCurveBuilder } from './tierProgressionCurveBuilder';

/**
 * Configuration for action pool on a meta-category.
 */
export interface PoolConfig {
	readonly size: number;
	readonly fillMode: TierProgressionCurveConfig;
}

export class PoolBuilder {
	private poolSize: number | undefined;
	private fillModeConfig: TierProgressionCurveConfig | undefined;

	/**
	 * Sets the pool size - how many actions to keep available.
	 * @param size Number of actions in the pool (must be positive integer)
	 */
	size(size: number): this {
		if (!Number.isInteger(size) || size < 1) {
			throw new Error(`Pool size must be a positive integer, got ${size}`);
		}
		this.poolSize = size;
		return this;
	}

	/**
	 * Sets the fill mode for selecting actions for the pool.
	 * @param fillMode Tier progression curve builder or config
	 */
	fillMode(fillMode: TierProgressionCurveBuilder | TierProgressionCurveConfig): this {
		this.fillModeConfig = fillMode instanceof TierProgressionCurveBuilder ? fillMode.build() : fillMode;
		return this;
	}

	build(): PoolConfig {
		if (this.poolSize === undefined) {
			throw new Error('Pool is missing size(). Call size() before build().');
		}
		if (this.fillModeConfig === undefined) {
			throw new Error('Pool is missing fillMode(). Call fillMode() before build().');
		}

		return {
			size: this.poolSize,
			fillMode: this.fillModeConfig,
		};
	}
}

/**
 * Creates a new pool configuration builder.
 */
export function pool(): PoolBuilder {
	return new PoolBuilder();
}
