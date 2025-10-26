import type { ResourceChangeRoundingMode } from '@kingdom-builder/contents/resourceV2';
import { createTestEngine } from '../helpers.ts';

interface ResourceMappings {
	resource: Map<string, string>;
	stat: Map<string, string>;
}

let mappings: ResourceMappings | undefined;

function ensureMappings(): ResourceMappings {
	if (mappings) {
		return mappings;
	}
	const engine = createTestEngine();
	const resource = new Map<string, string>();
	const stat = new Map<string, string>();
	for (const key of Object.keys(engine.activePlayer.resources)) {
		const id = engine.activePlayer.getResourceV2Id(key);
		resource.set(key, id);
	}
	for (const key of Object.keys(engine.activePlayer.stats)) {
		const id = engine.activePlayer.getStatResourceV2Id(key);
		stat.set(key, id);
	}
	mappings = { resource, stat };
	return mappings;
}

function resolveResourceId(key: string): string {
	const lookup = ensureMappings();
	return lookup.resource.get(key) ?? lookup.stat.get(key) ?? key;
}

export function resourceAmountParams<K extends string>(key: K, amount: number) {
	return {
		resourceId: resolveResourceId(key),
		change: { type: 'amount', amount },
		key,
		amount,
	} as const;
}

interface ResourcePercentOptions {
	readonly roundingMode?: ResourceChangeRoundingMode;
}

export function resourcePercentParams<K extends string>(
	key: K,
	percent: number,
	options: ResourcePercentOptions = {},
) {
	return {
		resourceId: resolveResourceId(key),
		change: {
			type: 'percent' as const,
			modifiers: [percent],
			...(options.roundingMode ? { roundingMode: options.roundingMode } : {}),
		},
		key,
		percent,
	} as const;
}

export function statAmountParams<K extends string>(key: K, amount: number) {
	return {
		resourceId: resolveResourceId(key),
		change: { type: 'amount', amount },
		key,
		amount,
	} as const;
}
