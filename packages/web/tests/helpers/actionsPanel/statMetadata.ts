import type { SessionRegistries } from '../../../src/state/sessionRegistries';

export interface StatDescriptor {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description: string;
}

export interface StatMetadataResult {
	readonly capacityStat: string;
	readonly derivedStatKeys: readonly string[];
	readonly entries: readonly [string, StatDescriptor][];
}

export function humanizeId(identifier: string): string {
	return identifier
		.split(/[-_.\s]+/u)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function collectStatKeysFromValue(value: unknown, keys: Set<string>): void {
	if (Array.isArray(value)) {
		for (const entry of value) {
			collectStatKeysFromValue(entry, keys);
		}
		return;
	}
	if (!value || typeof value !== 'object') {
		return;
	}
	const record = value as Record<string, unknown>;
	// Resource unified all stats under type: 'resource'
	if (record.type === 'resource') {
		const params = record.params as { resourceId?: unknown } | undefined;
		if (params && typeof params.resourceId === 'string') {
			keys.add(params.resourceId);
		}
	}
	for (const nested of Object.values(record)) {
		if (nested && typeof nested === 'object') {
			collectStatKeysFromValue(nested, keys);
		}
	}
}

function deriveStatKeys(registries: SessionRegistries): string[] {
	const keys = new Set<string>();
	const scanRegistry = <T>(registry: { entries(): [string, T][] }) => {
		for (const [, definition] of registry.entries()) {
			collectStatKeysFromValue(definition, keys);
		}
	};
	scanRegistry(registries.actions);
	scanRegistry(registries.buildings);
	scanRegistry(registries.developments);
	// Populations are now unified under resources in V2 system
	return Array.from(keys);
}

function selectCapacityStat(
	derivedStatKeys: string[],
	provided?: string,
): string {
	if (provided) {
		return provided;
	}
	const lowerCaseMatch = (candidate: string, fragments: readonly string[]) => {
		const lowered = candidate.toLowerCase();
		return fragments.some((fragment) => lowered.includes(fragment));
	};
	const prioritized = derivedStatKeys.find((key) =>
		lowerCaseMatch(key, ['population', 'capacity', 'cap']),
	);
	if (prioritized) {
		return prioritized;
	}
	return derivedStatKeys[0] ?? 'stat.capacity';
}

function createStatDescriptor(statId: string, index: number): StatDescriptor {
	const label = humanizeId(statId);
	return {
		id: statId,
		label,
		icon: index === 0 ? '📊' : undefined,
		description: `${label} descriptor`,
	};
}

export function createStatMetadata(
	registries: SessionRegistries,
	capacityStatOverride?: string,
): StatMetadataResult {
	const derivedStatKeys = deriveStatKeys(registries);
	const capacityStat = selectCapacityStat(
		derivedStatKeys,
		capacityStatOverride,
	);
	const entries = derivedStatKeys.map(
		(statId, index) => [statId, createStatDescriptor(statId, index)] as const,
	);
	if (!derivedStatKeys.includes(capacityStat)) {
		entries.push([
			capacityStat,
			createStatDescriptor(capacityStat, derivedStatKeys.length),
		]);
	}
	return {
		capacityStat,
		derivedStatKeys,
		entries,
	};
}
