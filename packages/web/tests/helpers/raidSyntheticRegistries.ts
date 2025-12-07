import { vi } from 'vitest';

// Use vi.hoisted() so the syntheticContent is available when vi.mock runs
const syntheticContent = vi.hoisted(() => {
	const resourceIds = {
		ap: 'ap',
		gold: 'gold',
		happiness: 'happiness',
		castleHP: 'castleHP',
		tier: 'tierResource',
	} as const;
	const statIds = {
		armyStrength: 'armyStrength',
		absorption: 'absorption',
		fortificationStrength: 'fortificationStrength',
		warWeariness: 'warWeariness',
	} as const;
	const combatStatConfig = {
		power: { key: 'synthetic:valor' },
		absorption: { key: 'synthetic:veil' },
		fortification: { key: 'synthetic:rampart' },
	} as const;
	const resourceEnum: Record<string, string> = {};
	for (const [property, key] of Object.entries(resourceIds)) {
		resourceEnum[property] = key;
	}
	const statEnum: Record<string, string> = {};
	for (const [property, key] of Object.entries(statIds)) {
		statEnum[property] = key;
	}
	for (const config of Object.values(combatStatConfig)) {
		statEnum[config.resourceId] = config.resourceId;
	}
	const synthBuilding = {
		id: 'synthetic:stronghold',
		name: 'Training Stronghold',
		icon: '🏯',
	};
	const buildingRegistry = {
		add(_id: string, _definition: unknown) {},
		get(id: string) {
			if (id === synthBuilding.id) {
				return synthBuilding;
			}
			throw new Error(`Missing registry entry: ${id}`);
		},
		has(id: string) {
			return id === synthBuilding.id;
		},
		keys() {
			return [synthBuilding.id];
		},
		entries() {
			return [[synthBuilding.id, synthBuilding] as const];
		},
	};
	const synthResourceMeta = {
		ap: { key: 'ap', icon: '⚙️', label: 'Action Points' },
		gold: { key: 'gold', icon: '🪙', label: 'Gold' },
		happiness: { key: 'happiness', icon: '😊', label: 'Happiness' },
		castleHP: { key: 'castleHP', icon: '🏰', label: 'Castle HP' },
		tierResource: { key: 'tierResource', icon: '🎖️', label: 'Tier Resource' },
	};
	const synthStatMeta = {
		armyStrength: { key: 'armyStrength', icon: '⚔️', label: 'Army Strength' },
		absorption: { key: 'absorption', icon: '🛡️', label: 'Absorption' },
		fortificationStrength: {
			key: 'fortificationStrength',
			icon: '🏯',
			label: 'Fortification',
		},
		warWeariness: { key: 'warWeariness', icon: '💤', label: 'War Weariness' },
	};
	return {
		Resource: resourceEnum,
		Stat: statEnum,
		RESOURCES: synthResourceMeta,
		STATS: synthStatMeta,
		BUILDINGS: buildingRegistry,
	};
});

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
