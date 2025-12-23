/**
 * Seeded Random Number Generator service.
 * Uses xorshift128+ algorithm for quality random numbers.
 * Ensures reproducibility across clients and replays.
 */
export class RngService {
	private state: [number, number];

	/**
	 * Creates a new RNG instance with the given seed.
	 * @param seed The initial seed value
	 */
	constructor(seed: number) {
		// Initialize state from seed using SplitMix64-like algorithm
		let hash = seed >>> 0;
		hash = (hash + 0x9e3779b9) >>> 0;
		hash = (hash ^ (hash >>> 16)) >>> 0;
		hash = Math.imul(hash, 0x85ebca6b) >>> 0;
		hash = (hash ^ (hash >>> 13)) >>> 0;
		hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
		hash = (hash ^ (hash >>> 16)) >>> 0;
		const state0 = hash >>> 0;

		hash = (seed + 0x9e3779b9 + 0x9e3779b9) >>> 0;
		hash = (hash ^ (hash >>> 16)) >>> 0;
		hash = Math.imul(hash, 0x85ebca6b) >>> 0;
		hash = (hash ^ (hash >>> 13)) >>> 0;
		hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
		hash = (hash ^ (hash >>> 16)) >>> 0;
		const state1 = hash >>> 0;

		this.state = [state0 || 1, state1 || 1];
	}

	/**
	 * Generates the next random 32-bit unsigned integer.
	 */
	private next(): number {
		let stateA = this.state[0];
		let stateB = this.state[1];

		// xorshift128+
		stateB ^= stateA;
		this.state[0] = ((stateA << 23) | (stateA >>> 9)) ^ stateB ^ (stateB << 3);
		this.state[1] = (stateB << 17) | (stateB >>> 15);

		return (this.state[0] + this.state[1]) >>> 0;
	}

	/**
	 * Returns a random float between 0 (inclusive) and 1 (exclusive).
	 */
	random(): number {
		return this.next() / 0x100000000;
	}

	/**
	 * Returns a random integer between 0 (inclusive) and max (exclusive).
	 * @param max The exclusive upper bound
	 */
	randomInt(max: number): number {
		return Math.floor(this.random() * max);
	}

	/**
	 * Performs a weighted random selection from a set of options.
	 * @param weights Array of weights (higher weight = higher probability)
	 * @returns The index of the selected option
	 */
	weightedSelect(weights: number[]): number {
		if (weights.length === 0) {
			throw new Error('Cannot select from empty weights array');
		}

		const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
		if (totalWeight <= 0) {
			throw new Error('Total weight must be positive');
		}

		const roll = this.random() * totalWeight;
		let cumulative = 0;

		for (let i = 0; i < weights.length; i++) {
			cumulative += weights[i]!;
			if (roll < cumulative) {
				return i;
			}
		}

		// Fallback to last index (shouldn't happen with correct implementation)
		return weights.length - 1;
	}

	/**
	 * Shuffles an array in place using Fisher-Yates algorithm.
	 * @param array The array to shuffle
	 * @returns The same array, shuffled
	 */
	shuffle<T>(array: T[]): T[] {
		for (let i = array.length - 1; i > 0; i--) {
			const j = this.randomInt(i + 1);
			const temp = array[i]!;
			array[i] = array[j]!;
			array[j] = temp;
		}
		return array;
	}

	/**
	 * Selects a random element from an array.
	 * @param array The array to select from
	 * @returns A random element
	 */
	pick<T>(array: readonly T[]): T {
		if (array.length === 0) {
			throw new Error('Cannot pick from empty array');
		}
		return array[this.randomInt(array.length)]!;
	}
}
