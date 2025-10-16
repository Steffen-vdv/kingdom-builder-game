export function cloneValue<T>(value: T): T {
	if (typeof structuredClone === 'function') {
		return structuredClone(value) as unknown as T;
	}
	const serialized = JSON.stringify(value);
	return JSON.parse(serialized) as unknown as T;
}
