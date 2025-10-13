import type { EngineSession } from '@kingdom-builder/engine';
import type {
	SessionDeveloperPresetPlan,
	SessionDeveloperPresetPlayerPlan,
	SessionRegistriesMetadata,
} from '@kingdom-builder/protocol';

type ApplyDeveloperPresetOptions = Parameters<
	EngineSession['applyDeveloperPreset']
>[0];

function cloneResourceTargets(
	entries: SessionDeveloperPresetPlayerPlan['resources'],
) {
	if (!entries || entries.length === 0) {
		return undefined;
	}
	return entries.map((entry) => ({ key: entry.key, target: entry.target }));
}

function clonePopulationPlan(
	entries: SessionDeveloperPresetPlayerPlan['population'],
) {
	if (!entries || entries.length === 0) {
		return undefined;
	}
	return entries.map((entry) => ({ role: entry.role, count: entry.count }));
}

function cloneStringList(entries: string[] | undefined) {
	if (!entries || entries.length === 0) {
		return undefined;
	}
	return [...entries];
}

function mergePlayerPlans(
	basePlan: SessionDeveloperPresetPlayerPlan | undefined,
	overridePlan: SessionDeveloperPresetPlayerPlan | undefined,
): SessionDeveloperPresetPlayerPlan | undefined {
	if (!basePlan && !overridePlan) {
		return undefined;
	}
	const merged: SessionDeveloperPresetPlayerPlan = {};
	let hasValues = false;
	const resourceSource = overridePlan?.resources ?? basePlan?.resources;
	const resources = cloneResourceTargets(resourceSource);
	if (resources) {
		merged.resources = resources;
		hasValues = true;
	}
	const populationSource = overridePlan?.population ?? basePlan?.population;
	const population = clonePopulationPlan(populationSource);
	if (population) {
		merged.population = population;
		hasValues = true;
	}
	const landCount = overridePlan?.landCount ?? basePlan?.landCount;
	if (
		typeof landCount === 'number' &&
		Number.isFinite(landCount) &&
		landCount >= 0
	) {
		merged.landCount = landCount;
		hasValues = true;
	}
	const developmentSource =
		overridePlan?.developments ?? basePlan?.developments;
	const developments = cloneStringList(developmentSource);
	if (developments) {
		merged.developments = developments;
		hasValues = true;
	}
	const buildingSource = overridePlan?.buildings ?? basePlan?.buildings;
	const buildings = cloneStringList(buildingSource);
	if (buildings) {
		merged.buildings = buildings;
		hasValues = true;
	}
	if (!hasValues) {
		return undefined;
	}
	return merged;
}

function selectPlayerPlan(
	presetPlan: SessionDeveloperPresetPlan,
	playerId: string,
): SessionDeveloperPresetPlayerPlan | undefined {
	const basePlan = presetPlan.player;
	const overridePlan = presetPlan.players?.[playerId];
	return mergePlayerPlans(basePlan, overridePlan);
}

function hasInstructions(plan: SessionDeveloperPresetPlayerPlan): boolean {
	if (plan.resources && plan.resources.length > 0) {
		return true;
	}
	if (plan.population && plan.population.length > 0) {
		return true;
	}
	if (typeof plan.landCount === 'number') {
		return true;
	}
	if (plan.developments && plan.developments.length > 0) {
		return true;
	}
	if (plan.buildings && plan.buildings.length > 0) {
		return true;
	}
	return false;
}

export function applyDeveloperPresetPlan(
	session: EngineSession,
	metadata: SessionRegistriesMetadata | undefined,
): void {
	const presetPlan = metadata?.developerPresetPlan;
	if (!presetPlan) {
		return;
	}
	const snapshot = session.getSnapshot();
	const players = snapshot.game.players ?? [];
	for (const player of players) {
		if (!player) {
			continue;
		}
		const plan = selectPlayerPlan(presetPlan, player.id);
		if (!plan || !hasInstructions(plan)) {
			continue;
		}
		const options: ApplyDeveloperPresetOptions = {
			playerId: player.id,
		};
		const resources = cloneResourceTargets(plan.resources);
		if (resources) {
			options.resources = resources;
		}
		const population = clonePopulationPlan(plan.population);
		if (population) {
			options.population = population;
		}
		if (typeof plan.landCount === 'number' && Number.isFinite(plan.landCount)) {
			options.landCount = plan.landCount;
		}
		const developments = cloneStringList(plan.developments);
		if (developments) {
			options.developments = developments;
		}
		const buildings = cloneStringList(plan.buildings);
		if (buildings) {
			options.buildings = buildings;
		}
		session.applyDeveloperPreset(options);
	}
}
