import { GAME_START, DEVELOPMENTS } from '@kingdom-builder/contents';
import type {
	SessionDeveloperPresetPlan,
	SessionDeveloperPresetPlanEntry,
} from '@kingdom-builder/protocol/session';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';

const DEFAULT_TARGET_LAND_COUNT = 5;

const numberIsFinite = (value: unknown): value is number => {
	return typeof value === 'number' && Number.isFinite(value);
};

const cloneNumericRecord = (
	record: Record<string, number> | undefined,
): Record<string, number> | undefined => {
	if (!record) {
		return undefined;
	}
	const entries: Array<[string, number]> = [];
	for (const [key, value] of Object.entries(record)) {
		if (!numberIsFinite(value)) {
			continue;
		}
		entries.push([key, value]);
	}
	if (entries.length === 0) {
		return undefined;
	}
	return Object.fromEntries(entries) as Record<string, number>;
};

const collectDevelopmentIds = (
	config: PlayerStartConfig | undefined,
): string[] => {
	if (!config?.lands) {
		return [];
	}
	const identifiers = new Set<string>();
	for (const land of config.lands) {
		if (!Array.isArray(land?.developments)) {
			continue;
		}
		for (const id of land.developments) {
			if (typeof id === 'string' && id.trim().length > 0) {
				identifiers.add(id);
			}
		}
	}
	return [...identifiers];
};

const freezePlanEntry = (
	entry: SessionDeveloperPresetPlanEntry,
): SessionDeveloperPresetPlanEntry => {
	const frozen: SessionDeveloperPresetPlanEntry = {};
	if (entry.resources) {
		frozen.resources = { ...entry.resources };
	}
	if (entry.population) {
		frozen.population = { ...entry.population };
	}
	if (typeof entry.landCount === 'number') {
		frozen.landCount = entry.landCount;
	}
	if (entry.developments) {
		frozen.developments = [...entry.developments];
	}
	if (entry.buildings) {
		frozen.buildings = [...entry.buildings];
	}
	return frozen;
};

const createPlanEntry = (
	config: PlayerStartConfig | undefined,
): SessionDeveloperPresetPlanEntry | undefined => {
	if (!config) {
		return undefined;
	}
	const entry: SessionDeveloperPresetPlanEntry = {};
	const resources = cloneNumericRecord(config.resources);
	if (resources) {
		entry.resources = resources;
	}
	const population = cloneNumericRecord(config.population);
	if (population) {
		entry.population = population;
	}
	if (Array.isArray(config.lands) && config.lands.length > 0) {
		entry.landCount = config.lands.length;
	}
	const developments = collectDevelopmentIds(config);
	if (developments.length > 0) {
		entry.developments = developments;
	}
	return Object.keys(entry).length > 0 ? entry : undefined;
};

const createDevelopmentPlan = (): string[] => {
	const entries: Array<{ id: string; order: number }> = [];
	for (const [identifier, definition] of DEVELOPMENTS.entries()) {
		if (!definition || typeof definition !== 'object') {
			continue;
		}
		if ((definition as { system?: boolean }).system) {
			continue;
		}
		const order = (definition as { order?: number }).order;
		entries.push({
			id: identifier,
			order: typeof order === 'number' ? order : Number.MAX_SAFE_INTEGER,
		});
	}
	entries.sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return left.id.localeCompare(right.id);
	});
	return entries.map((entry) => entry.id);
};

export function buildDeveloperPresetPlan():
	| SessionDeveloperPresetPlan
	| undefined {
	const devMode = GAME_START.modes?.dev;
	if (!devMode) {
		return undefined;
	}
	const baseEntry = createPlanEntry(devMode.player) ?? {};
	const developmentPlan = createDevelopmentPlan();
	if (developmentPlan.length > 0) {
		baseEntry.developments = developmentPlan;
	}
	const explicitLandCount = numberIsFinite(baseEntry.landCount)
		? baseEntry.landCount
		: 0;
	const resolvedLandCount = Math.max(
		DEFAULT_TARGET_LAND_COUNT,
		developmentPlan.length,
		explicitLandCount,
	);
	if (resolvedLandCount > 0) {
		baseEntry.landCount = resolvedLandCount;
	}
	const plan: SessionDeveloperPresetPlan = {};
	if (Object.keys(baseEntry).length > 0) {
		plan.default = freezePlanEntry(baseEntry);
	}
	if (devMode.players) {
		const overrides: Array<[string, SessionDeveloperPresetPlanEntry]> = [];
		for (const [playerId, config] of Object.entries(devMode.players)) {
			const entry = createPlanEntry(config);
			if (!entry) {
				continue;
			}
			overrides.push([playerId, freezePlanEntry(entry)]);
		}
		if (overrides.length > 0) {
			plan.players = Object.freeze(Object.fromEntries(overrides));
		}
	}
	if (!plan.default && !plan.players) {
		return undefined;
	}
	return Object.freeze(plan);
}
