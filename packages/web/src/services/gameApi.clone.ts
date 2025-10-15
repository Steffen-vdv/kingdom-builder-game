import type {
	SessionPlayerId,
	SessionRunAiResponse,
	SessionSimulateResponse,
} from '@kingdom-builder/protocol/session';

type CloneFn = <T>(value: T) => T;

const deepClone = <T>(value: T, seen = new WeakMap<object, unknown>()): T => {
	if (value === null || typeof value !== 'object') {
		return value;
	}

	const cached = seen.get(value as object);
	if (cached) {
		return cached as T;
	}

	if (value instanceof Date) {
		const result = new Date(value.getTime());
		seen.set(value, result);
		return result as unknown as T;
	}

	if (Array.isArray(value)) {
		const source = value as unknown[];
		const result = source.map((item) => deepClone(item, seen));
		seen.set(value, result);
		return result as unknown as T;
	}

	if (value instanceof Map) {
		const source = value as Map<unknown, unknown>;
		const result = new Map<unknown, unknown>();
		seen.set(value, result);
		for (const [key, entry] of source.entries()) {
			const clonedKey = deepClone(key, seen);
			const clonedEntry = deepClone(entry, seen);
			result.set(clonedKey, clonedEntry);
		}
		return result as unknown as T;
	}

	if (value instanceof Set) {
		const source = value as Set<unknown>;
		const result = new Set<unknown>();
		seen.set(value, result);
		for (const entry of source.values()) {
			const clonedEntry = deepClone(entry, seen);
			result.add(clonedEntry);
		}
		return result as unknown as T;
	}

	if (value instanceof RegExp) {
		const result = new RegExp(value.source, value.flags);
		seen.set(value, result);
		return result as unknown as T;
	}

	const objectValue = value as Record<string, unknown>;
	const prototype = Object.getPrototypeOf(objectValue) as object | null;
	if (prototype === null || prototype === Object.prototype) {
		const result: Record<string, unknown> = {};
		seen.set(value as object, result);
		const entries = Object.entries(objectValue);
		for (const [key, entry] of entries) {
			result[key] = deepClone(entry, seen);
		}
		return result as unknown as T;
	}

	return value;
};

export const clone: CloneFn = (value) => {
	if (typeof structuredClone === 'function') {
		const cloneFn = structuredClone as unknown as <U>(input: U) => U;
		try {
			return cloneFn(value);
		} catch {
			// Fall through when structuredClone cannot process
			// the provided value.
		}
	}

	return deepClone(value);
};

export const clonePlayerResponseMap = <T>(
	source?: Map<string, Map<SessionPlayerId, T>>,
): Map<string, Map<SessionPlayerId, T>> => {
	const result = new Map<string, Map<SessionPlayerId, T>>();
	if (!source) {
		return result;
	}
	for (const [sessionId, playerMap] of source.entries()) {
		const cloned = new Map<SessionPlayerId, T>();
		for (const [playerId, response] of playerMap.entries()) {
			cloned.set(playerId, clone(response));
		}
		result.set(sessionId, cloned);
	}
	return result;
};

export type SimulationMap = Map<
	string,
	Map<SessionPlayerId, SessionSimulateResponse>
>;

export type RunAiMap = Map<string, Map<SessionPlayerId, SessionRunAiResponse>>;
