import type {
	PlayerStartConfig,
	SessionDeveloperPresetPlan,
	SessionDeveloperPresetPlayerPlan,
	SessionDeveloperPresetPopulationEntry,
	SessionDeveloperPresetResourceTarget,
	StartConfig,
} from '@kingdom-builder/protocol';

const DEFAULT_DEVELOPER_PRESET_LAND_COUNT = 5;

function toFinitePositive(value: unknown): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		return undefined;
	}
	return value;
}

function buildDeveloperPresetPlayerPlan(
	config: PlayerStartConfig | undefined,
): SessionDeveloperPresetPlayerPlan | undefined {
	if (!config) {
		return undefined;
	}
	let hasValues = false;
	const plan: SessionDeveloperPresetPlayerPlan = {};
	if (config.resources) {
		const resources: SessionDeveloperPresetResourceTarget[] = [];
		for (const [key, amount] of Object.entries(config.resources)) {
			if (typeof key !== 'string') {
				continue;
			}
			if (typeof amount !== 'number' || !Number.isFinite(amount)) {
				continue;
			}
			resources.push({
				key,
				target: amount,
			});
		}
		if (resources.length > 0) {
			plan.resources = resources;
			hasValues = true;
		}
	}
	if (config.population) {
		const population: SessionDeveloperPresetPopulationEntry[] = [];
		for (const [role, count] of Object.entries(config.population)) {
			if (typeof role !== 'string') {
				continue;
			}
			if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
				continue;
			}
			population.push({
				role,
				count,
			});
		}
		if (population.length > 0) {
			plan.population = population;
			hasValues = true;
		}
	}
	const developments: string[] = [];
	if (Array.isArray(config.lands)) {
		for (const land of config.lands) {
			if (!land) {
				continue;
			}
			if (Array.isArray(land.developments)) {
				for (const id of land.developments) {
					if (typeof id === 'string' && id.trim().length > 0) {
						developments.push(id);
					}
				}
			}
		}
	}
	if (developments.length > 0) {
		plan.developments = [...developments];
		hasValues = true;
	}
	const explicitLandCount = toFinitePositive(config.lands?.length);
	let resolvedLandCount: number | undefined;
	if (typeof explicitLandCount === 'number') {
		resolvedLandCount = explicitLandCount;
	} else if (hasValues) {
		resolvedLandCount = Math.max(
			DEFAULT_DEVELOPER_PRESET_LAND_COUNT,
			developments.length,
		);
	}
	if (
		typeof resolvedLandCount === 'number' &&
		Number.isFinite(resolvedLandCount)
	) {
		plan.landCount = resolvedLandCount;
		hasValues = true;
	}
	if (!hasValues) {
		return undefined;
	}
	return plan;
}

export function createDeveloperPresetPlan(
	start: StartConfig,
): SessionDeveloperPresetPlan | undefined {
	const devModeConfig = start.modes?.dev;
	if (!devModeConfig) {
		return undefined;
	}
	const basePlan = buildDeveloperPresetPlayerPlan(devModeConfig.player);
	const overrideEntries: Array<[string, SessionDeveloperPresetPlayerPlan]> = [];
	if (devModeConfig.players) {
		for (const [playerId, override] of Object.entries(devModeConfig.players)) {
			const overridePlan = buildDeveloperPresetPlayerPlan(override);
			if (!overridePlan) {
				continue;
			}
			overrideEntries.push([playerId, overridePlan]);
		}
	}
	if (!basePlan && overrideEntries.length === 0) {
		return undefined;
	}
	const plan: SessionDeveloperPresetPlan = {};
	if (basePlan) {
		plan.player = basePlan;
	}
	if (overrideEntries.length > 0) {
		plan.players = Object.fromEntries(overrideEntries);
	}
	return plan;
}
