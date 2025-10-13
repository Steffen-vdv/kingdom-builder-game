import type { EngineSession } from '@kingdom-builder/engine';
import { buildSessionMetadata } from '../content/buildSessionMetadata.js';
import type { SessionDeveloperPresetPlanEntry } from '@kingdom-builder/protocol/session';

type DeveloperPresetOptions = Parameters<
	EngineSession['applyDeveloperPreset']
>[0];

type DeveloperPresetPlan = ReturnType<
	typeof buildSessionMetadata
>['developerPresetPlan'];

const developerPresetPlan: DeveloperPresetPlan =
	buildSessionMetadata().developerPresetPlan;

const cloneResourceTargets = (
	targets: NonNullable<SessionDeveloperPresetPlanEntry['resources']>,
): NonNullable<DeveloperPresetOptions['resources']> => {
	return targets.map((entry) => {
		return { key: entry.key, target: entry.target };
	});
};

const clonePopulationPlan = (
	population: NonNullable<SessionDeveloperPresetPlanEntry['population']>,
): NonNullable<DeveloperPresetOptions['population']> => {
	return population.map((entry) => {
		return { role: entry.role, count: entry.count };
	});
};

const cloneDevelopments = (
	developments: NonNullable<SessionDeveloperPresetPlanEntry['developments']>,
): NonNullable<DeveloperPresetOptions['developments']> => {
	return [...developments];
};

const cloneBuildings = (
	buildings: NonNullable<SessionDeveloperPresetPlanEntry['buildings']>,
): NonNullable<DeveloperPresetOptions['buildings']> => {
	return [...buildings];
};

const createPresetOptions = (
	playerId: DeveloperPresetOptions['playerId'],
	entry: SessionDeveloperPresetPlanEntry,
): DeveloperPresetOptions | undefined => {
	const options: DeveloperPresetOptions = { playerId };
	if (entry.resources && entry.resources.length > 0) {
		options.resources = cloneResourceTargets(entry.resources);
	}
	if (entry.population && entry.population.length > 0) {
		options.population = clonePopulationPlan(entry.population);
	}
	if (typeof entry.landCount === 'number') {
		options.landCount = entry.landCount;
	}
	if (entry.developments && entry.developments.length > 0) {
		options.developments = cloneDevelopments(entry.developments);
	}
	if (entry.buildings && entry.buildings.length > 0) {
		options.buildings = cloneBuildings(entry.buildings);
	}
	if (
		options.resources === undefined &&
		options.population === undefined &&
		options.landCount === undefined &&
		options.developments === undefined &&
		options.buildings === undefined
	) {
		return undefined;
	}
	return options;
};

const applyPlanEntry = (
	session: EngineSession,
	playerId: DeveloperPresetOptions['playerId'],
	entry: SessionDeveloperPresetPlanEntry,
): void => {
	const options = createPresetOptions(playerId, entry);
	if (!options) {
		return;
	}
	session.applyDeveloperPreset(options);
};

export const applyDeveloperPresetPlan = (session: EngineSession): void => {
	if (!developerPresetPlan) {
		return;
	}
	const snapshot = session.getSnapshot();
	const players = snapshot.game.players;
	if (!Array.isArray(players) || players.length === 0) {
		return;
	}
	if (developerPresetPlan.player) {
		for (const player of players) {
			applyPlanEntry(session, player.id, developerPresetPlan.player);
		}
	}
	if (developerPresetPlan.players) {
		for (const player of players) {
			const override = developerPresetPlan.players[player.id];
			if (!override) {
				continue;
			}
			applyPlanEntry(session, player.id, override);
		}
	}
};
