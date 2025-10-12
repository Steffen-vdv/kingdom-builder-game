import { vi } from 'vitest';

import {
	SYNTH_RESOURCE_IDS,
	SYNTH_RESOURCE_METADATA,
	SYNTH_STAT_IDS,
	SYNTH_STAT_METADATA,
	SYNTH_BUILDING,
	COMBAT_STAT_CONFIG,
} from './armyAttackConfig';

type SyntheticBuilding = typeof SYNTH_BUILDING;

type SimpleRegistry<Definition extends { id: string }> = {
	add(id: string, definition: Definition): void;
	get(id: string): Definition;
	has(id: string): boolean;
	keys(): string[];
	entries(): Array<[string, Definition]>;
};

function createSimpleRegistry<Definition extends { id: string }>(
	definitions: Definition[],
): SimpleRegistry<Definition> {
	const items = new Map<string, Definition>();
	for (const definition of definitions) {
		items.set(definition.id, definition);
	}
	return {
		add(id, definition) {
			items.set(id, definition);
		},
		get(id) {
			const value = items.get(id);
			if (!value) {
				throw new Error(`Missing registry entry: ${id}`);
			}
			return value;
		},
		has(id) {
			return items.has(id);
		},
		keys() {
			return Array.from(items.keys());
		},
		entries() {
			return Array.from(items.entries());
		},
	};
}

const syntheticContent = (() => {
	const resourceEnum: Record<string, string> = {};
	for (const [property, key] of Object.entries(SYNTH_RESOURCE_IDS)) {
		resourceEnum[property] = key;
	}
	const statEnum: Record<string, string> = {};
	for (const [property, key] of Object.entries(SYNTH_STAT_IDS)) {
		statEnum[property] = key;
	}
	for (const config of Object.values(COMBAT_STAT_CONFIG)) {
		statEnum[config.key] = config.key;
	}
	const buildingRegistry = createSimpleRegistry<SyntheticBuilding>([
		{ ...SYNTH_BUILDING },
	]);
	return {
		Resource: resourceEnum,
		Stat: statEnum,
		RESOURCES: SYNTH_RESOURCE_METADATA,
		STATS: SYNTH_STAT_METADATA,
		BUILDINGS: buildingRegistry,
	};
})();

vi.mock('@kingdom-builder/contents', async () => {
	const actual = (await vi.importActual('@kingdom-builder/contents')) as Record<
		string,
		unknown
	>;
	return {
		...actual,
		Resource: syntheticContent.Resource,
		RESOURCES: syntheticContent.RESOURCES,
		Stat: syntheticContent.Stat,
		STATS: syntheticContent.STATS,
		BUILDINGS: syntheticContent.BUILDINGS,
	};
});

export const SYNTHETIC_CONTENT_OVERRIDES = syntheticContent;
