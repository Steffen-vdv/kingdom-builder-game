import type { EngineSession, PlayerId } from '@kingdom-builder/engine';
import type { DeveloperPresetConfig } from '../startup/runtimeConfig';

function cloneResourceTargets(
	targets: DeveloperPresetConfig['resources'],
): DeveloperPresetConfig['resources'] {
	if (!targets) {
		return undefined;
	}
	return targets.map((entry) => ({ ...entry }));
}

function clonePopulationPlan(
	plan: DeveloperPresetConfig['population'],
): DeveloperPresetConfig['population'] {
	if (!plan) {
		return undefined;
	}
	return plan.map((entry) => ({ ...entry }));
}

function cloneStringList(values: string[] | undefined): string[] | undefined {
	if (!values) {
		return undefined;
	}
	return [...values];
}

export function initializeDeveloperMode(
	session: EngineSession,
	playerId: PlayerId,
	preset?: DeveloperPresetConfig,
): void {
	if (!preset) {
		return;
	}
	const options: Parameters<EngineSession['applyDeveloperPreset']>[0] = {
		playerId,
	};
	const resources = cloneResourceTargets(preset.resources);
	if (resources) {
		options.resources = resources;
	}
	const population = clonePopulationPlan(preset.population);
	if (population) {
		options.population = population;
	}
	if (preset.landCount !== undefined) {
		options.landCount = preset.landCount;
	}
	const developments = cloneStringList(preset.developments);
	if (developments) {
		options.developments = developments;
	}
	const buildings = cloneStringList(preset.buildings);
	if (buildings) {
		options.buildings = buildings;
	}
	session.applyDeveloperPreset(options);
}
