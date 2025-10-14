export function cloneValue<T>(value: T): T {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	if (value === undefined) {
		return value;
	}
	return JSON.parse(JSON.stringify(value)) as T;
}
