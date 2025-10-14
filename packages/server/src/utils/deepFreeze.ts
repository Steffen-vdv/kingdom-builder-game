export function deepFreeze<T>(value: T): T {
	if (Array.isArray(value)) {
		for (const entry of value) {
			deepFreeze(entry);
		}
		return Object.freeze(value);
	}
	if (value && typeof value === 'object') {
		for (const entry of Object.values(value as Record<string, unknown>)) {
			deepFreeze(entry);
		}
		return Object.freeze(value);
	}
	return value;
}

export function freezeClone<T>(value: T): T {
	return deepFreeze(structuredClone(value));
}
