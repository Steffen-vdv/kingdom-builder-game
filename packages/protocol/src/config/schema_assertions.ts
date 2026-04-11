/**
 * Type-level assertions used to verify that a Zod schema's inferred type
 * matches the canonical TypeScript interface for a protocol contract.
 *
 * Zod's `.optional()` produces properties typed as `field?: T | undefined`
 * while our interfaces use the `exactOptionalPropertyTypes` shape
 * `field?: T`. Those two shapes are semantically equivalent for our
 * purposes — a value that omits the property satisfies both — but they are
 * not identical types, so a plain `Equal<X, Y>` check rejects them.
 *
 * {@link ExactOptionalize} rewrites a type so that optional properties no
 * longer carry an explicit `| undefined`, which lets {@link Equal} compare
 * Zod-inferred types against `exactOptionalPropertyTypes`-style interfaces.
 */

type EmptyObject = Record<string, never>;

export type ExactOptionalize<T> = T extends readonly (infer E)[]
	? T extends unknown[]
		? ExactOptionalize<E>[]
		: readonly ExactOptionalize<E>[]
	: T extends object
		? {
				[K in keyof T as EmptyObject extends Pick<T, K>
					? never
					: K]: ExactOptionalize<T[K]>;
			} & {
				[K in keyof T as EmptyObject extends Pick<T, K> ? K : never]?: Exclude<
					ExactOptionalize<T[K]>,
					undefined
				>;
			} extends infer O
			? { [K in keyof O]: O[K] }
			: never
		: T;

export type Equal<X, Y> =
	(<T>() => T extends ExactOptionalize<X> ? 1 : 2) extends <
		T,
	>() => T extends ExactOptionalize<Y> ? 1 : 2
		? true
		: false;

export type Expect<T extends true> = T;
