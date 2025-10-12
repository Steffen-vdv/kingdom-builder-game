import {
	PRIMARY_ICON_ID,
	RESOURCES,
	PHASES,
	GAME_START,
	RULES,
	createDevelopmentRegistry,
	BuildingId,
	PopulationRole,
	Resource,
} from '@kingdom-builder/contents';
import type {
	DeveloperPresetConfig,
	IconSource,
	RuntimeBootstrapConfig,
} from './runtimeBootstrap';

const TARGET_GOLD = 100;
const TARGET_HAPPINESS = 10;
const TARGET_LAND_COUNT = 5;

function buildResourceMetadata(): Record<string, IconSource> {
	const metadata: Record<string, IconSource> = {};
	for (const [key, info] of Object.entries(RESOURCES)) {
		const entry: IconSource = {};
		if (info.icon !== undefined) {
			entry.icon = info.icon;
		}
		if (info.label !== undefined) {
			entry.label = info.label;
		}
		if (info.description !== undefined) {
			entry.description = info.description;
		}
		metadata[key] = entry;
	}
	return metadata;
}

function buildDevelopmentPlan(): string[] {
	const registry = createDevelopmentRegistry();
	const identifiers: string[] = [];
	for (const identifier of registry.keys()) {
		if (registry.has(identifier)) {
			identifiers.push(identifier);
		}
	}
	identifiers.sort((left, right) => left.localeCompare(right));
	return identifiers;
}

function buildDeveloperPreset(): DeveloperPresetConfig {
	const developments = buildDevelopmentPlan();
	return {
		resources: [
			{ key: Resource.gold as string, target: TARGET_GOLD },
			{ key: Resource.happiness as string, target: TARGET_HAPPINESS },
		],
		population: [
			{ role: PopulationRole.Council as string, count: 2 },
			{ role: PopulationRole.Legion as string, count: 1 },
			{ role: PopulationRole.Fortifier as string, count: 1 },
		],
		developments,
		buildings: [BuildingId.Mill],
		landCount: Math.max(TARGET_LAND_COUNT, developments.length),
	};
}

function clonePhases() {
	return structuredClone(PHASES);
}

function cloneStartConfig() {
	return structuredClone(GAME_START);
}

function cloneRuleSet() {
	return structuredClone(RULES);
}

export function createDefaultBootstrapConfig(): RuntimeBootstrapConfig {
	return {
		primaryResourceId: PRIMARY_ICON_ID,
		resourceMetadata: buildResourceMetadata(),
		phases: clonePhases(),
		start: cloneStartConfig(),
		rules: cloneRuleSet(),
		developerPreset: buildDeveloperPreset(),
	};
}
