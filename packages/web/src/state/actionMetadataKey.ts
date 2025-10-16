import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';

function stableSerialize(value: unknown): string {
	if (value === null || value === undefined) {
		return 'null';
	}
	if (typeof value !== 'object') {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		const serialized = value.map((entry) => stableSerialize(entry));
		return `[${serialized.join(',')}]`;
	}
	const entries = Object.entries(value as Record<string, unknown>)
		.map(([key, entry]) => [key, entry] as const)
		.sort(([left], [right]) => {
			if (left < right) {
				return -1;
			}
			if (left > right) {
				return 1;
			}
			return 0;
		})
		.map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`);
	return `{${entries.join(',')}}`;
}

export function serializeActionParams(
	params: ActionParametersPayload | undefined,
): string {
	if (!params || Object.keys(params).length === 0) {
		return '{}';
	}
	return stableSerialize(params);
}

export function createMetadataKey(
	actionId: string,
	params: ActionParametersPayload | undefined,
): string {
	return `${actionId}:${serializeActionParams(params)}`;
}
